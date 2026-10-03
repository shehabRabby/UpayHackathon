"use client";
import { useState, type InputHTMLAttributes } from "react";
import { ProductIcon } from "./brand";
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return <div className="password-field"><input {...props} type={visible ? "text" : "password"} /><button type="button" className="password-toggle" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} aria-controls={props.id} disabled={props.disabled} onClick={() => setVisible(value => !value)}><ProductIcon name={visible ? "eye-off" : "eye"} /></button></div>;
}
