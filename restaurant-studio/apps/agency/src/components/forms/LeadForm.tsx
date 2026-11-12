"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  HONEYPOT_FIELD,
  LEAD_FIELDS,
  emptyLeadValues,
  validateLead,
  type FieldDef,
  type FieldErrors,
  type LeadValues,
} from "@/lib/lead/definition";

/** Why a request could not be sent. Each has its own wording in FAILURES below. */
type Failure = "failed" | "unconfigured" | "rateLimited";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; id: string }
  | { state: "error"; failure: Failure };

/**
 * What the visitor is told. `retry` is the advice shown when the studio has no email or phone
 * to offer instead. Each message says only what is certain: after a timeout nobody can tell
 * whether a request arrived, so none of them claims that nothing was recorded.
 */
const FAILURES: Record<Failure, { message: string; retry?: string }> = {
  failed: { message: "Your request did not go through just now.", retry: "Please try again in a little while." },
  unconfigured: { message: "This form is not connected to an inbox yet, so it cannot take requests." },
  rateLimited: { message: "That is a lot of requests in a short time. Please wait a few minutes and try again." },
};

type ApiResponse = { ok: boolean; id?: string; error?: string; fieldErrors?: FieldErrors };

/** The server rejects tokens younger than 2.5 seconds, so very fast submissions wait out the difference. */
const TOKEN_MIN_AGE_MS = 2_800;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The consultation request form.
 *
 * It validates in the browser with the same rules the server uses, moves focus to the first
 * problem, and reports success only when the server says the request reached the inbox.
 */
export function LeadForm({
  email,
  phone,
  phoneHref,
  replyTime,
}: {
  /** The studio's email and phone, when they are set. Shown whenever the form cannot send. */
  email?: string;
  phone?: string;
  phoneHref?: string;
  replyTime: string;
}) {
  const uid = useId();
  const [values, setValues] = useState<LeadValues>(emptyLeadValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [honeypot, setHoneypot] = useState("");
  /** False when the server says the inbox is not set up. Null until the first answer arrives. */
  const [accepting, setAccepting] = useState<boolean | null>(null);
  const token = useRef<{ value: string; at: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  /**
   * Asks the server for a form token and keeps it. Resolves to whether the inbox is accepting
   * requests, or to null when the server could not be reached.
   */
  async function fetchToken(): Promise<{ accepting: boolean } | null> {
    try {
      const res = await fetch("/api/form-token", { method: "POST" });
      const data = (await res.json()) as { token?: string; accepting?: boolean };
      if (!res.ok || !data.token) return null;
      token.current = { value: data.token, at: Date.now() };
      return { accepting: data.accepting !== false };
    } catch {
      return null;
    }
  }

  // Ask for a token as soon as the form is on screen, so it has aged by the time someone finishes typing.
  useEffect(() => {
    let onScreen = true;
    void fetchToken().then((answer) => {
      if (onScreen && answer) setAccepting(answer.accepting);
    });
    return () => {
      onScreen = false;
    };
  }, []);

  // Pages stay mounted while hidden during navigation. Clear a finished request when this page is
  // hidden, so coming back shows a fresh form instead of an old thank-you.
  const finished = useRef(false);
  useLayoutEffect(() => {
    return () => {
      if (finished.current) {
        finished.current = false;
        setStatus({ state: "idle" });
        setValues(emptyLeadValues());
        setErrors({});
      }
    };
  }, []);

  useEffect(() => {
    if (status.state === "success" || status.state === "error") resultRef.current?.focus();
  }, [status.state]);

  const fieldId = (name: string) => `${uid}-${name}`;

  function setField(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== name)));
    }
  }

  function showErrors(fieldErrors: FieldErrors) {
    setErrors(fieldErrors);
    setStatus({ state: "idle" });
    const first = LEAD_FIELDS.find((field) => fieldErrors[field.name]);
    if (!first) return;
    const target = first.type === "radio" ? `${fieldId(first.name)}-0` : fieldId(first.name);
    document.getElementById(target)?.focus();
  }

  async function send(attempt: number): Promise<void> {
    if (!token.current && !(await fetchToken())) {
      setStatus({ state: "error", failure: "failed" });
      return;
    }
    const age = Date.now() - token.current!.at;
    if (age < TOKEN_MIN_AGE_MS) await sleep(TOKEN_MIN_AGE_MS - age);

    let res: Response;
    let data: ApiResponse;
    try {
      res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.current!.value, [HONEYPOT_FIELD]: honeypot, values }),
      });
      data = (await res.json()) as ApiResponse;
    } catch {
      setStatus({ state: "error", failure: "failed" });
      return;
    }

    if (res.ok && data.ok && data.id) {
      token.current = null;
      finished.current = true;
      setStatus({ state: "success", id: data.id });
      void fetchToken();
      return;
    }
    if (res.status === 422 && data.fieldErrors) {
      showErrors(data.fieldErrors);
      return;
    }
    if (data.error === "token" && attempt === 1) {
      // The token expired or was already used (the tab sat open for hours, say). Get a new one and retry once.
      token.current = null;
      await send(2);
      return;
    }
    if (data.error === "unconfigured") {
      setAccepting(false);
      setStatus({ state: "error", failure: "unconfigured" });
      return;
    }
    if (res.status === 429) {
      setStatus({ state: "error", failure: "rateLimited" });
      return;
    }
    setStatus({ state: "error", failure: "failed" });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.state === "submitting") return;
    const check = validateLead(values);
    if (!check.ok) {
      showErrors(check.errors);
      return;
    }
    setErrors({});
    setStatus({ state: "submitting" });
    await send(1);
  }

  function reset() {
    finished.current = false;
    setValues(emptyLeadValues());
    setErrors({});
    setStatus({ state: "idle" });
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus());
  }

  if (status.state === "success") {
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        role="status"
        data-lead-status="success"
        className="rounded-xl border-2 border-success bg-card p-6 outline-none sm:p-9"
      >
        <span className="grid size-12 place-items-center rounded-full bg-success text-card">
          <Icon name="check" strokeWidth={2.2} className="size-6" />
        </span>
        <h2 className="display display-md mt-5">Your request is in.</h2>
        <p className="mt-4 max-w-[52ch] text-ink-soft">
          Thank you. You should get a short email confirming that it arrived. I read every request myself and
          reply personally, usually {replyTime}. Nothing is booked or owed at this point.
        </p>
        <p className="mt-5 font-mono text-[0.9rem]">
          Your reference: <strong className="nums font-medium tracking-wide text-ink" data-lead-reference>{status.id}</strong>
        </p>
        <button type="button" onClick={reset} className="link-arrow mt-5">
          Send another request
        </button>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;
  const submitting = status.state === "submitting";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={submitting} data-form="lead">
      <p className="text-[0.95rem] text-ink-soft">
        Fields marked <span aria-hidden="true">*</span>
        <span className="sr-only">with an asterisk</span> are required.
      </p>

      {accepting === false && status.state !== "error" && (
        <div role="status" className="mt-5 rounded-lg border-2 border-danger bg-card p-4 text-[0.98rem]">
          <ContactNotice failure="unconfigured" email={email} phone={phone} phoneHref={phoneHref} />
        </div>
      )}

      {errorCount > 0 && (
        <div role="alert" className="mt-5 rounded-lg border-2 border-danger bg-card p-4 text-[0.98rem] font-semibold text-danger">
          {errorCount === 1 ? "One field needs attention." : `${errorCount} fields need attention.`} Please check the
          marked {errorCount === 1 ? "field" : "fields"} below.
        </div>
      )}

      {status.state === "error" && (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="alert"
          data-lead-status="error"
          className="mt-5 rounded-lg border-2 border-danger bg-card p-4 text-[0.98rem] outline-none"
        >
          <ContactNotice failure={status.failure} email={email} phone={phone} phoneHref={phoneHref} />
        </div>
      )}

      <div className="mt-6 grid gap-x-5 gap-y-6 sm:grid-cols-2">
        {LEAD_FIELDS.map((field) => (
          <Field
            key={field.name}
            field={field}
            id={fieldId(field.name)}
            value={values[field.name] ?? ""}
            error={errors[field.name]}
            onChange={(value) => setField(field.name, value)}
          />
        ))}
      </div>

      {/* Honeypot. People never see or reach this field; scripts that fill in every input do. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={fieldId(HONEYPOT_FIELD)}>Leave this field empty</label>
        <input
          id={fieldId(HONEYPOT_FIELD)}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <p className="mt-7 border-l-2 border-accent pl-4 text-[0.95rem] text-ink-soft">
        Sending this form does not sign you up for anything. It asks me to get in touch, and that is all.
      </p>

      <div className="mt-6">
        <button type="submit" className="btn btn-primary w-full sm:w-auto sm:min-w-[15rem]" disabled={submitting}>
          {submitting ? "Sending…" : "Send my request"}
          {!submitting && <Icon name="arrow" className="btn-arrow size-5" />}
        </button>
      </div>

      <noscript>
        <p className="mt-5 text-[0.95rem]">
          This form needs JavaScript.
          {email ? ` Please email ${email} instead.` : phone ? ` Please call ${phone} instead.` : ""}
        </p>
      </noscript>
    </form>
  );
}

/** A notice that the form could not send, followed by the studio's email and phone when they are known. */
function ContactNotice({
  failure,
  email,
  phone,
  phoneHref,
}: {
  failure: Failure;
  email?: string;
  phone?: string;
  phoneHref?: string;
}) {
  const { message, retry } = FAILURES[failure];
  const direct = Boolean(email || (phone && phoneHref));
  return (
    <>
      <p className="font-semibold text-danger">{message}</p>
      {direct ? (
        <>
          <p className="mt-2">You can reach me directly instead:</p>
          <p className="flex flex-wrap gap-x-6">
            {email && (
              <a href={`mailto:${email}`} className="link inline-flex min-h-11 items-center [overflow-wrap:anywhere]">
                {email}
              </a>
            )}
            {phone && phoneHref && (
              <a href={phoneHref} className="link nums inline-flex min-h-11 items-center">
                {phone}
              </a>
            )}
          </p>
        </>
      ) : retry ? (
        <p className="mt-2">{retry}</p>
      ) : null}
    </>
  );
}

function Field({
  field,
  id,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const describedBy = [field.help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const wrapper = field.width === "half" ? "" : "sm:col-span-2";

  const requiredMark = field.required ? (
    <span aria-hidden="true" className="text-accent">
      {" "}
      *
    </span>
  ) : null;

  const notes = (
    <>
      {field.help && (
        <p id={`${id}-help`} className="field-help">
          {field.help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </>
  );

  if (field.type === "radio") {
    return (
      <fieldset
        className={wrapper}
        role="radiogroup"
        aria-required={field.required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      >
        <legend className="field-label">
          {field.label}
          {requiredMark}
        </legend>
        <div className="flex flex-wrap gap-2">
          {field.options?.map((option, index) => (
            <label key={option} className="choice">
              <input
                id={`${id}-${index}`}
                type="radio"
                name={field.name}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              {option}
            </label>
          ))}
        </div>
        {notes}
      </fieldset>
    );
  }

  const common = {
    id,
    name: field.name,
    value,
    required: field.required,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: "field-input",
  } as const;

  return (
    <div className={wrapper}>
      <label htmlFor={id} className="field-label">
        {field.label}
        {requiredMark}
      </label>

      {field.type === "textarea" ? (
        <textarea
          {...common}
          rows={5}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === "select" ? (
        <select {...common} onChange={(event) => onChange(event.target.value)}>
          <option value="">{field.placeholder ?? "Choose one"}</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={field.type}
          inputMode={field.inputMode}
          maxLength={field.maxLength}
          autoComplete={field.autoComplete}
          autoCapitalize={field.inputMode === "url" || field.type === "email" ? "none" : undefined}
          spellCheck={field.inputMode === "url" || field.type === "email" ? false : undefined}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {notes}
    </div>
  );
}
