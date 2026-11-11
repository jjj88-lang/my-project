"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  addDaysIso,
  todayIn,
  validate,
  type FieldDef,
  type FieldErrors,
  type FormDef,
  type FormValues,
} from "@/lib/forms/definitions";
import type { DeliveryPreview, EmailMessage } from "@/lib/inbox/types";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; id: string; preview?: DeliveryPreview }
  | { state: "error"; message: string };

type ApiResponse = {
  ok: boolean;
  id?: string;
  error?: string;
  fieldErrors?: FieldErrors;
  preview?: DeliveryPreview;
};

/** The server rejects tokens younger than this, so very fast submissions wait out the difference. */
const TOKEN_MIN_AGE_MS = 2_800;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const noopSubscribe = () => () => {};

function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function emptyValues(def: FormDef): FormValues {
  return Object.fromEntries(def.fields.map((f) => [f.name, ""]));
}

export function InquiryForm({
  def,
  timeZone,
  phone,
  phoneHref,
}: {
  def: FormDef;
  timeZone: string;
  phone: string;
  phoneHref: string;
}) {
  const uid = useId();
  const hydrated = useHydrated();
  const [values, setValues] = useState<FormValues>(() => emptyValues(def));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [honeypot, setHoneypot] = useState("");
  const token = useRef<{ value: string; at: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function fetchToken(): Promise<boolean> {
    try {
      const res = await fetch("/api/form-token", { method: "POST" });
      const data = (await res.json()) as { token?: string };
      if (!res.ok || !data.token) return false;
      token.current = { value: data.token, at: Date.now() };
      return true;
    } catch {
      return false;
    }
  }

  // Ask for a token as soon as the form is on screen, so it has aged by the time someone finishes typing.
  useEffect(() => {
    void fetchToken();
  }, []);

  // Pages stay mounted while hidden during navigation. Clear a finished submission when this one is
  // hidden, so coming back shows a fresh form instead of an old success message.
  const finished = useRef(false);
  useLayoutEffect(() => {
    return () => {
      if (finished.current) {
        finished.current = false;
        setStatus({ state: "idle" });
        setValues(emptyValues(def));
        setErrors({});
      }
    };
  }, [def]);

  useEffect(() => {
    if (status.state === "success" || status.state === "error") resultRef.current?.focus();
  }, [status.state]);

  const fieldId = (name: string) => `${uid}-${name}`;
  const minDate = hydrated && def.leadTimeDays !== undefined ? addDaysIso(todayIn(timeZone), def.leadTimeDays) : undefined;

  function setField(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== name)));
  }

  function showErrors(fieldErrors: FieldErrors) {
    setErrors(fieldErrors);
    setStatus({ state: "idle" });
    const first = def.fields.find((f) => fieldErrors[f.name]);
    if (first) document.getElementById(fieldId(first.name))?.focus();
  }

  const fallback = `We could not send your request just now. Please call us at ${phone} and we will take care of it.`;

  async function send(attempt: number): Promise<void> {
    if (!token.current && !(await fetchToken())) {
      setStatus({ state: "error", message: fallback });
      return;
    }
    const age = Date.now() - token.current!.at;
    if (age < TOKEN_MIN_AGE_MS) await sleep(TOKEN_MIN_AGE_MS - age);

    let res: Response;
    let data: ApiResponse;
    try {
      res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: def.kind, token: token.current!.value, company_website: honeypot, values }),
      });
      data = (await res.json()) as ApiResponse;
    } catch {
      setStatus({ state: "error", message: fallback });
      return;
    }

    if (res.ok && data.ok && data.id) {
      token.current = null;
      finished.current = true;
      setStatus({ state: "success", id: data.id, preview: data.preview });
      void fetchToken();
      return;
    }
    if (res.status === 422 && data.fieldErrors) {
      showErrors(data.fieldErrors);
      return;
    }
    if (data.error === "token" && attempt === 1) {
      // The token expired or was already used (for example the tab sat open for hours). Get a new one and retry once.
      token.current = null;
      await send(2);
      return;
    }
    if (res.status === 429) {
      setStatus({
        state: "error",
        message: `That is a lot of requests in a short time. Please wait a few minutes, or call us at ${phone}.`,
      });
      return;
    }
    setStatus({ state: "error", message: fallback });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.state === "submitting") return;
    const check = validate(def, values, { today: todayIn(timeZone), phone });
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
    setValues(emptyValues(def));
    setErrors({});
    setStatus({ state: "idle" });
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus());
  }

  if (status.state === "success") {
    return (
      <div>
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          className="rounded-site border border-accent/50 bg-accent/[0.07] p-6 outline-none md:p-8"
        >
          <span className="grid size-11 place-items-center rounded-full bg-accent text-on-accent">
            <Icon name="check" strokeWidth={2.2} />
          </span>
          <h3 className="display mt-5 text-[2rem]">{def.successTitle}</h3>
          <p className="mt-3 max-w-[52ch] text-muted">{def.successBody}</p>
          <p className="mt-4 text-sm">
            Your reference: <strong className="nums font-semibold tracking-wide">{status.id}</strong>
          </p>
          <button type="button" onClick={reset} className="link-arrow mt-6">
            Send another request
          </button>
        </div>
        {status.preview && <DemoPreview preview={status.preview} />}
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;
  const submitting = status.state === "submitting";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={submitting} data-form={def.kind}>
      <p className="text-sm text-muted">
        Fields marked <span aria-hidden="true">*</span>
        <span className="sr-only">with an asterisk</span> are required.
      </p>

      {errorCount > 0 && (
        <div role="alert" className="mt-5 rounded-site border border-[var(--c-danger,#e5786d)] p-4 text-[0.95rem]">
          {errorCount === 1 ? "One field needs attention." : `${errorCount} fields need attention.`} Please check the
          highlighted {errorCount === 1 ? "field" : "fields"} below.
        </div>
      )}
      {status.state === "error" && (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="alert"
          className="mt-5 rounded-site border border-[var(--c-danger,#e5786d)] p-4 text-[0.95rem] outline-none"
        >
          {status.message}{" "}
          <a href={phoneHref} className="text-link whitespace-nowrap">
            Call {phone}
          </a>
        </div>
      )}

      <div className="mt-6 grid gap-x-5 gap-y-6 sm:grid-cols-2">
        {def.fields.map((field) => (
          <Field
            key={field.name}
            field={field}
            id={fieldId(field.name)}
            value={values[field.name] ?? ""}
            error={errors[field.name]}
            min={field.type === "date" ? minDate : undefined}
            onChange={(value) => setField(field.name, value)}
          />
        ))}
      </div>

      {/* Honeypot. People never see or reach this field; many bots fill in every input they find. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={fieldId("company_website")}>Leave this field empty</label>
        <input
          id={fieldId("company_website")}
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <p className="mt-7 border-l-2 border-accent pl-4 text-[0.95rem] text-muted">{def.disclaimer}</p>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" className="btn btn-solid min-w-[13rem]" disabled={submitting}>
          {submitting ? "Sending…" : def.submitLabel}
        </button>
        <p className="text-sm text-muted">
          Prefer to talk?{" "}
          <a href={phoneHref} className="text-link whitespace-nowrap">
            Call {phone}
          </a>
        </p>
      </div>

      <noscript>
        <p className="mt-5 text-sm">This form needs JavaScript. Please call us at {phone} instead.</p>
      </noscript>
    </form>
  );
}

function Field({
  field,
  id,
  value,
  error,
  min,
  onChange,
}: {
  field: FieldDef;
  id: string;
  value: string;
  error?: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  const describedBy = [field.help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
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
    <div className={field.width === "half" ? "" : "sm:col-span-2"}>
      <label htmlFor={id} className="field-label">
        {field.label}
        {field.required ? (
          <span aria-hidden="true" className="text-accent">
            {" "}
            *
          </span>
        ) : null}
      </label>

      {field.type === "textarea" ? (
        <textarea
          {...common}
          rows={5}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "select" ? (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
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
          type={field.type === "number" ? "text" : field.type}
          inputMode={field.type === "number" ? "numeric" : undefined}
          pattern={field.type === "number" ? "[0-9]*" : undefined}
          min={min}
          maxLength={field.maxLength}
          autoComplete={field.autoComplete}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

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
    </div>
  );
}

/* --------------------------- Sample-site walkthrough --------------------------- */

function EmailCard({ email, from }: { email: EmailMessage; from: string }) {
  return (
    <div className="overflow-hidden rounded-site border border-line bg-bg text-[0.9rem]">
      <dl className="grid gap-1 border-b border-line bg-raised px-4 py-3">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted">From</dt>
          <dd className="min-w-0 break-words">{from}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted">To</dt>
          <dd className="min-w-0 break-all">{email.to || "the owner's inbox"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted">Subject</dt>
          <dd className="min-w-0 break-words font-semibold">{email.subject}</dd>
        </div>
      </dl>
      <p className="whitespace-pre-wrap break-words px-4 py-4 leading-relaxed text-ink/90">{email.text}</p>
    </div>
  );
}

/**
 * Shown only on sample sites: a look at what a live site does with a submission.
 * Nothing was stored or sent; these are previews built from what the visitor just typed.
 */
function DemoPreview({ preview }: { preview: DeliveryPreview }) {
  const steps = [
    {
      title: "Recorded",
      text: `A new row is added to the “${preview.sheet}” tab of a Google Sheet the restaurant owns, with the status set to New.`,
      body: (
        <div className="overflow-x-auto rounded-site border border-line bg-bg">
          <table className="w-full min-w-[30rem] border-collapse text-left text-[0.86rem]">
            <tbody>
              {Object.entries(preview.row)
                .filter(([, value]) => value !== "")
                .map(([label, value]) => (
                  <tr key={label} className="border-b border-line last:border-0">
                    <th scope="row" className="w-44 bg-raised px-3 py-2 align-top font-semibold">
                      {label}
                    </th>
                    <td className="whitespace-pre-wrap break-words px-3 py-2">{value}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      title: "Owner notified",
      text: "The owner gets an email with every detail. Replying to it answers the customer directly.",
      body: <EmailCard email={preview.ownerEmail} from="Website inquiries" />,
    },
    {
      title: "Customer acknowledged",
      text: "The customer gets a short note saying the request arrived. It confirms nothing: no date, no price, no availability.",
      body: <EmailCard email={preview.customerEmail} from="The restaurant" />,
    },
  ];

  return (
    <section className="mt-10" aria-labelledby="demo-preview-heading">
      <p className="eyebrow">Sample concept · behind the scenes</p>
      <h3 id="demo-preview-heading" className="display mt-3 text-[1.9rem]">
        What a live site does next
      </h3>
      <p className="mt-3 max-w-[60ch] text-muted">
        On a real restaurant&apos;s site these three things happen within seconds. On this sample, nothing was stored and
        no email was sent. These are previews built from what you just typed.
      </p>
      <ol className="mt-8 grid gap-8">
        {steps.map((step, i) => (
          <li key={step.title}>
            <div className="flex items-baseline gap-4">
              <span className="nums text-xs font-semibold tracking-[0.2em] text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h4 className="text-lg font-semibold">{step.title}</h4>
            </div>
            <p className="mb-4 mt-1 max-w-[60ch] text-[0.95rem] text-muted">{step.text}</p>
            {step.body}
          </li>
        ))}
      </ol>
    </section>
  );
}
