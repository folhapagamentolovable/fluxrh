import { useEffect, useState, type InputHTMLAttributes } from "react";
import { brazilianToIsoDate, isoToBrazilianDate, maskBrazilianDate } from "../../lib/date";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (isoDate: string) => void;
};

export function BrazilianDateInput({ value, defaultValue, onValueChange, onBlur, ...props }: Props) {
  const source = value ?? defaultValue ?? "";
  const [display, setDisplay] = useState(() => isoToBrazilianDate(source));
  useEffect(() => { if (value !== undefined) setDisplay(isoToBrazilianDate(value)); }, [value]);
  return <input
    {...props}
    type="text"
    inputMode="numeric"
    maxLength={10}
    placeholder="dd/mm/aaaa"
    pattern="(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/[0-9]{4}"
    value={display}
    onChange={(event) => {
      const masked = maskBrazilianDate(event.target.value);
      setDisplay(masked);
      const iso = brazilianToIsoDate(masked);
      event.currentTarget.setCustomValidity(masked.length === 10 && !iso ? "Informe uma data válida no formato dd/mm/aaaa." : "");
      if (iso) onValueChange?.(iso);
    }}
    onBlur={(event) => {
      event.currentTarget.setCustomValidity(display && !brazilianToIsoDate(display) ? "Informe uma data válida no formato dd/mm/aaaa." : "");
      onBlur?.(event);
    }}
    aria-label={props["aria-label"] ?? "Data no formato dd/mm/aaaa"}
  />;
}
