import "./Field.css";

interface BaseProps {
  label: string;
  hint?: string;
}

interface InputProps extends BaseProps {
  as?: "input";
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

interface TextareaProps extends BaseProps {
  as: "textarea";
  inputProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
}

type Props = InputProps | TextareaProps;

export default function Field({ label, hint, as: As = "input", inputProps }: Props) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      {As === "textarea" ? (
        <textarea
          className="field__control field__control--textarea"
          {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className="field__control"
          {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}
