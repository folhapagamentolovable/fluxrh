import { Modal } from "./Modal";

type DecisionModalProps = {
  open: boolean;
  title: string;
  description: string;
  decision: "approve" | "reject";
  note: string;
  pending: boolean;
  error?: unknown;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function DecisionModal({
  open,
  title,
  description,
  decision,
  note,
  pending,
  error,
  onNoteChange,
  onClose,
  onConfirm,
}: DecisionModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
    >
      <div className="validation-modal">
        <label>
          Justificativa
          <textarea
            autoFocus
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Descreva a conferência e o motivo da decisão"
          />
        </label>
        {Boolean(error) && (
          <p className="form-error" role="alert">
            Não foi possível registrar a decisão.
          </p>
        )}
        <footer className="form-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={
              decision === "reject" ? "primary-button danger" : "primary-button"
            }
            disabled={note.trim().length < 3 || pending}
            onClick={onConfirm}
          >
            {pending
              ? "Registrando..."
              : decision === "approve"
                ? "Confirmar aprovação"
                : "Confirmar rejeição"}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
