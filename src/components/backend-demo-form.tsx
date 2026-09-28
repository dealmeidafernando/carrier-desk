"use client";

import { useState } from "react";
import { IconSend } from "@tabler/icons-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type DemoResult = {
  ok: boolean;
  status: number;
  responsePreview: string;
};

export function BackendDemoForm() {
  const [endpoint, setEndpoint] = useState("https://httpbin.org/anything");
  const [apiKey, setApiKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/backend-demo", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ endpoint, apiKey }),
      });

      const payload = (await response.json().catch(() => null)) as
        | DemoResult
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : "Request failed."
        );
      }

      setResult(payload as DemoResult);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Request failed."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="endpoint">Endpoint URL</FieldLabel>
          <Input
            id="endpoint"
            name="endpoint"
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="https://httpbin.org/anything"
            value={endpoint}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="apiKey">API key</FieldLabel>
          <Input
            id="apiKey"
            name="apiKey"
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Paste a test API key"
            type="password"
            value={apiKey}
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <IconSend data-icon="inline-start" />
          )}
          {pending ? "Calling..." : "Call backend route"}
        </Button>
      </FieldGroup>

      {error ? (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Request failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Response</CardTitle>
              {result.ok ? (
                <Badge className="border-transparent bg-success/10 text-success">
                  {result.status} ok
                </Badge>
              ) : (
                <Badge variant="destructive">{result.status} error</Badge>
              )}
            </div>
            <CardDescription>
              Outbound call executed by the Next.js route handler.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {result.responsePreview}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}
