import React from 'react';
import { AlertTriangle, Clock, MapPin, Calendar, X, CheckCircle2 } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { Inconsistencia } from '../hooks/useValidacaoHorarioPonto';

interface ConfirmacaoInconsistenciaModalProps {
  inconsistencias: Inconsistencia[];
  onConfirmar: () => void;
  onCancelar: () => void;
  processando?: boolean;
}

const iconesPorTipo: Record<Inconsistencia['tipo'], React.ReactNode> = {
  'HORARIO_FORA_TOLERANCIA': <Clock className="w-5 h-5" />,
  'POSTO_DIFERENTE': <MapPin className="w-5 h-5" />,
  'DIA_FOLGA': <Calendar className="w-5 h-5" />,
  'SEM_ESCALA': <AlertTriangle className="w-5 h-5" />
};

const coresPorTipo: Record<Inconsistencia['tipo'], string> = {
  'HORARIO_FORA_TOLERANCIA': 'text-yellow-600 bg-yellow-500/10',
  'POSTO_DIFERENTE': 'text-orange-600 bg-orange-500/10',
  'DIA_FOLGA': 'text-red-600 bg-red-500/10',
  'SEM_ESCALA': 'text-muted-foreground bg-muted/50'
};

const titulosPorTipo: Record<Inconsistencia['tipo'], string> = {
  'HORARIO_FORA_TOLERANCIA': 'Horário Fora da Tolerância',
  'POSTO_DIFERENTE': 'Posto de Trabalho Diferente',
  'DIA_FOLGA': 'Dia de Folga',
  'SEM_ESCALA': 'Escala Não Definida'
};

export default function ConfirmacaoInconsistenciaModal({
  inconsistencias,
  onConfirmar,
  onCancelar,
  processando = false
}: ConfirmacaoInconsistenciaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-500/10 rounded-full">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Atenção! Inconsistências Detectadas
            </h2>
            <p className="text-sm text-muted-foreground">
              Verifique os itens abaixo antes de prosseguir
            </p>
          </div>
          <button
            onClick={onCancelar}
            className="ml-auto p-1 hover:bg-muted rounded-full"
            disabled={processando}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Lista de inconsistências */}
        <div className="space-y-3 mb-6">
          {inconsistencias.map((inconsistencia, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${coresPorTipo[inconsistencia.tipo]}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {iconesPorTipo[inconsistencia.tipo]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1">
                    {titulosPorTipo[inconsistencia.tipo]}
                  </h4>
                  <p className="text-sm opacity-90">
                    {inconsistencia.descricao}
                  </p>
                  
                  {/* Detalhes adicionais */}
                  {(inconsistencia.horario_esperado || inconsistencia.horario_registrado) && (
                    <div className="mt-2 text-xs space-y-1 opacity-80">
                      {inconsistencia.horario_esperado && (
                        <p>
                          <span className="font-medium">Esperado:</span> {inconsistencia.horario_esperado}
                        </p>
                      )}
                      {inconsistencia.horario_registrado && (
                        <p>
                          <span className="font-medium">Registrado:</span> {inconsistencia.horario_registrado}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {(inconsistencia.posto_esperado || inconsistencia.posto_registrado) && (
                    <div className="mt-2 text-xs space-y-1 opacity-80">
                      {inconsistencia.posto_esperado && (
                        <p>
                          <span className="font-medium">Seu posto:</span> {inconsistencia.posto_esperado}
                        </p>
                      )}
                      {inconsistencia.posto_registrado && (
                        <p>
                          <span className="font-medium">Registrando em:</span> {inconsistencia.posto_registrado}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Aviso */}
        <div className="bg-muted/50 p-3 rounded-lg mb-4">
          <p className="text-sm text-muted-foreground">
            <strong>Importante:</strong> Este registro será salvo com a marcação de inconsistência 
            para posterior revisão e aprovação pela administração.
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancelar}
            disabled={processando}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirmar}
            disabled={processando}
            className="flex-1 flex items-center justify-center gap-2"
          >
            {processando ? (
              <>
                <span className="animate-spin">⏳</span>
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Registro
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
