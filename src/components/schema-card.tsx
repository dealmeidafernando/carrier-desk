import { IconKey } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MAX_VISIBLE_COLUMNS,
  type TablePreview,
} from "@/lib/twin-preview";

export function SchemaCard({ table }: { table: TablePreview }) {
  const visibleColumns = table.columns.slice(0, MAX_VISIBLE_COLUMNS);
  const overflow = table.columns.length - MAX_VISIBLE_COLUMNS;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-mono text-sm">{table.name}</CardTitle>
          <Badge variant="secondary">{table.columns.length} cols</Badge>
        </div>
        <CardDescription>Columns and sample rows from Twin.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader className="bg-card">
              <TableRow className="border-dashed hover:bg-transparent">
                <TableHead className="px-4 py-3 text-left">Column</TableHead>
                <TableHead className="px-4 py-3 text-left">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleColumns.map((column) => (
                <TableRow key={column.name} className="border-dashed">
                  <TableCell className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{column.name}</span>
                      {column.isPrimaryKey ? (
                        <Badge variant="outline">
                          <IconKey data-icon="inline-start" />
                          PK
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-left text-muted-foreground">
                    <span className="font-mono text-xs">{column.type}</span>
                  </TableCell>
                </TableRow>
              ))}
              {overflow > 0 ? (
                <TableRow className="border-dashed">
                  <TableCell
                    colSpan={2}
                    className="px-4 py-3 text-left text-muted-foreground"
                  >
                    +{overflow} more columns
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Sample rows
          </p>
          {table.sampleError ? (
            <p className="text-sm text-destructive">{table.sampleError}</p>
          ) : table.sampleRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rows returned for this table.
            </p>
          ) : (
            table.sampleRows.map((row, index) => (
              <pre
                key={`${table.name}-${index}`}
                className="overflow-x-auto rounded-xl border bg-muted/40 p-3 font-mono text-xs leading-relaxed"
              >
                {JSON.stringify(row, null, 2)}
              </pre>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
