import "./Button.css";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost";
  block?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = "default",
  block = false,
  className = "",
  children,
  ...rest
}: Props) {
  const classes = [
    "btn",
    `btn--${variant}`,
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
