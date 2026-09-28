import Link from "next/link";
import { IconActivity, IconDatabase } from "@tabler/icons-react";

import { AppShell } from "@/components/app-shell";
import { BackendDemoForm } from "@/components/backend-demo-form";
import { SchemaCard } from "@/components/schema-card";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireAppUser } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { loadTwinPreview } from "@/lib/twin-preview";

export default async function HomePage() {
  const { user } = await requireAppUser();
  const publicEnv = getPublicEnv();
  const twinPreview = await loadTwinPreview(3);
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unknown";

  return (
    <AppShell title="HappyRobot Custom App">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Next.js, server-first, and ready to deploy.
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            This template keeps HappyRobot auth and Twin headers intact while
            moving server-only work like outbound API calls into route handlers.
          </p>
        </div>
        <div>
          <Button
            render={<Link href="/api/health" />}
            nativeButton={false}
          >
            <IconActivity data-icon="inline-start" />
            Health route
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Signed-in user</CardDescription>
            <CardTitle className="text-base">{displayName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Org</span>
              <span className="truncate font-mono text-xs">
                {publicEnv.orgId || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Twin tables</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {twinPreview.error ? "—" : twinPreview.totalTables}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Loaded via the HappyRobot app token in the session cookie.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>App stack</CardDescription>
            <CardTitle className="text-base">Next.js server-first</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">Auth broker</Badge>
            <Badge variant="secondary">Twin gateway</Badge>
            <Badge variant="secondary">Route handlers</Badge>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Twin preview</h2>
          <p className="text-sm text-muted-foreground">
            First tables from your org Twin database.
          </p>
        </div>

        {twinPreview.error ? (
          <Alert variant="destructive">
            <AlertTitle>Twin unavailable</AlertTitle>
            <AlertDescription>{twinPreview.error}</AlertDescription>
          </Alert>
        ) : twinPreview.tables.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconDatabase />
              </EmptyMedia>
              <EmptyTitle>No Twin tables yet</EmptyTitle>
              <EmptyDescription>
                Create tables in Twin and they will show up here automatically.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              {twinPreview.tables.map((table) => (
                <SchemaCard key={table.name} table={table} />
              ))}
            </div>
            {twinPreview.totalTables > twinPreview.tables.length ? (
              <p className="text-center text-sm text-muted-foreground">
                +{twinPreview.totalTables - twinPreview.tables.length} more
                table
                {twinPreview.totalTables - twinPreview.tables.length === 1
                  ? ""
                  : "s"}
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Backend route demo</CardTitle>
            <CardDescription>
              Enter a test API key and endpoint. The client posts them to a
              Next.js route handler, and the route handler performs the outbound
              request on the server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BackendDemoForm />
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
