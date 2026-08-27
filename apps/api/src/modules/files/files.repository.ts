import type {
  FileAsset,
  PrepareFileUploadInput,
  PreparedFileUpload,
} from "@fluxrh/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrganizationId } from "../../shared/supabase.js";

type FileAssetRow = {
  id: string;
  organization_id: string;
  owner_user_id: string;
  subject_user_id: string | null;
  category: FileAsset["category"];
  bucket_id: "fluxrh-private";
  object_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: FileAsset["status"];
  related_entity_type: string | null;
  related_entity_id: string | null;
  replaces_asset_id: string | null;
  checksum_sha256: string | null;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
  retention_until: string;
  legal_hold: boolean;
  legal_hold_reason: string | null;
};

const columns =
  "id,organization_id,owner_user_id,subject_user_id,category,bucket_id,object_path,original_name,mime_type,size_bytes,status,related_entity_type,related_entity_id,replaces_asset_id,checksum_sha256,uploaded_at,created_at,updated_at,retention_until,legal_hold,legal_hold_reason";

function mapAsset(row: FileAssetRow): FileAsset {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ownerUserId: row.owner_user_id,
    ...(row.subject_user_id ? { subjectUserId: row.subject_user_id } : {}),
    category: row.category,
    bucketId: row.bucket_id,
    objectPath: row.object_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    status: row.status,
    ...(row.related_entity_type
      ? { relatedEntityType: row.related_entity_type }
      : {}),
    ...(row.related_entity_id
      ? { relatedEntityId: row.related_entity_id }
      : {}),
    ...(row.replaces_asset_id
      ? { replacesAssetId: row.replaces_asset_id }
      : {}),
    ...(row.checksum_sha256 ? { checksumSha256: row.checksum_sha256 } : {}),
    ...(row.uploaded_at ? { uploadedAt: row.uploaded_at } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    retentionUntil: row.retention_until,
    legalHold: row.legal_hold,
    ...(row.legal_hold_reason
      ? { legalHoldReason: row.legal_hold_reason }
      : {}),
  };
}

export class SupabaseFilesRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(
    filter: {
      category?: FileAsset["category"];
      relatedEntityType?: string;
      relatedEntityId?: string;
    } = {},
  ) {
    const organizationId = await getCurrentOrganizationId(this.client);
    let query = this.client
      .from("file_assets")
      .select(columns)
      .eq("organization_id", organizationId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });
    if (filter.category) query = query.eq("category", filter.category);
    if (filter.relatedEntityType)
      query = query.eq("related_entity_type", filter.relatedEntityType);
    if (filter.relatedEntityId)
      query = query.eq("related_entity_id", filter.relatedEntityId);
    const { data, error } = await query;
    if (error) throw new Error(`file_assets_load_failed:${error.message}`);
    return (data as FileAssetRow[]).map(mapAsset);
  }

  async find(id: string): Promise<FileAsset | undefined> {
    const { data, error } = await this.client
      .from("file_assets")
      .select(columns)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`file_asset_load_failed:${error.message}`);
    return data ? mapAsset(data as FileAssetRow) : undefined;
  }

  async prepare(input: PrepareFileUploadInput): Promise<PreparedFileUpload> {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client.rpc("prepare_file_upload", {
      file_payload: { ...input, organizationId },
    });
    if (error) throw new Error(`file_upload_prepare_failed:${error.message}`);
    const prepared = data as {
      id: string;
      bucketId: "fluxrh-private";
      objectPath: string;
    };
    const signed = await this.client.storage
      .from(prepared.bucketId)
      .createSignedUploadUrl(prepared.objectPath, { upsert: false });
    if (signed.error) {
      await this.client.rpc("mark_file_asset_deleted", {
        asset_id_value: prepared.id,
      });
      throw new Error(`file_upload_sign_failed:${signed.error.message}`);
    }
    const asset = await this.find(prepared.id);
    if (!asset) throw new Error("file_asset_missing_after_prepare");
    return {
      asset,
      signedUrl: signed.data.signedUrl,
      token: signed.data.token,
    };
  }

  async complete(
    id: string,
    checksumSha256?: string,
  ): Promise<FileAsset | undefined> {
    const asset = await this.find(id);
    if (!asset) return undefined;
    const info = await this.client.storage
      .from(asset.bucketId)
      .info(asset.objectPath);
    if (info.error)
      throw new Error(`file_upload_verify_failed:${info.error.message}`);
    if (
      info.data.size !== asset.sizeBytes ||
      info.data.contentType !== asset.mimeType
    ) {
      throw new Error("file_upload_metadata_mismatch");
    }
    const { error } = await this.client.rpc("complete_file_upload", {
      asset_id_value: id,
      checksum_sha256_value: checksumSha256 ?? null,
    });
    if (error) throw new Error(`file_upload_complete_failed:${error.message}`);
    return this.find(id);
  }

  async signedDownload(id: string, expiresIn: number) {
    const asset = await this.find(id);
    if (!asset || !["uploaded", "superseded"].includes(asset.status))
      return undefined;
    const { data, error } = await this.client.storage
      .from(asset.bucketId)
      .createSignedUrl(asset.objectPath, expiresIn, {
        download: asset.originalName,
      });
    if (error) throw new Error(`file_download_sign_failed:${error.message}`);
    return { asset, signedUrl: data.signedUrl, expiresIn };
  }

  async remove(id: string): Promise<FileAsset | undefined> {
    const asset = await this.find(id);
    if (!asset) return undefined;
    const { error } = await this.client.storage
      .from(asset.bucketId)
      .remove([asset.objectPath]);
    if (error) throw new Error(`file_delete_failed:${error.message}`);
    const result = await this.client.rpc("mark_file_asset_deleted", {
      asset_id_value: id,
    });
    if (result.error)
      throw new Error(`file_asset_delete_mark_failed:${result.error.message}`);
    return { ...asset, status: "deleted", updatedAt: new Date().toISOString() };
  }

  async retentionPolicies() {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client
      .from("file_retention_policies")
      .select("organization_id,category,retention_days,updated_at")
      .eq("organization_id", organizationId)
      .order("category");
    if (error) throw new Error(`retention_policy_load_failed:${error.message}`);
    return (data ?? []).map((policy) => ({
      organizationId: policy.organization_id as string,
      category: policy.category as FileAsset["category"],
      retentionDays: policy.retention_days as number,
      updatedAt: policy.updated_at as string,
    }));
  }

  async updateRetentionPolicy(
    category: FileAsset["category"],
    retentionDays: number,
  ) {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client.rpc(
      "update_file_retention_policy",
      {
        organization_id_value: organizationId,
        category_value: category,
        retention_days_value: retentionDays,
      },
    );
    if (error)
      throw new Error(`retention_policy_update_failed:${error.message}`);
    return data;
  }

  async setLegalHold(id: string, enabled: boolean, reason: string) {
    const { error } = await this.client.rpc("set_file_legal_hold", {
      asset_id_value: id,
      enabled_value: enabled,
      reason_value: reason,
    });
    if (error) throw new Error(`file_legal_hold_failed:${error.message}`);
    return this.find(id);
  }
}
