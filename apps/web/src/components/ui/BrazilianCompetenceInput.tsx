import { useEffect, useState, type InputHTMLAttributes } from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onValueChange: (isoCompetence: string) => void;
};

const toDisplay = (value: string) =>
  /^\d{4}-\d{2}$/.test(value)
    ? `${value.slice(5, 7)}/${value.slice(0, 4)}`
    : value;
const toIso = (value: string) =>
  /^(0[1-9]|1[0-2])\/\d{4}$/.test(value)
    ? `${value.slice(3)}-${value.slice(0, 2)}`
    : "";
const mask = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
};

export function BrazilianCompetenceInput({
  value,
  onValueChange,
  ...props
}: Props) {
  const [display, setDisplay] = useState(() => toDisplay(value));
  useEffect(() => setDisplay(toDisplay(value)), [value]);
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      maxLength={7}
      placeholder="mm/aaaa"
      pattern="(0[1-9]|1[0-2])/[0-9]{4}"
      value={display}
      onChange={(event) => {
        const next = mask(event.target.value);
        setDisplay(next);
        onValueChange(toIso(next));
      }}
      aria-label={props["aria-label"] ?? "Competência no formato mm/aaaa"}
    />
  );
}
