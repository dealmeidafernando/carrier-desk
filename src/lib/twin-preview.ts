import { getTwinRows, getTwinSchema, type OpenAPISpec } from "@/lib/twin";

export type ColumnInfo = {
  name: string;
  type: string;
  isPrimaryKey: boolean;
};

export type TablePreview = {
  name: string;
  columns: ColumnInfo[];
  sampleRows: Record<string, unknown>[];
  sampleError: string | null;
};

const MAX_VISIBLE_COLUMNS = 8;
const MAX_VISIBLE_SAMPLE_ROWS = 2;

export async function loadTwinPreview(limit = 3): Promise<{
  tables: TablePreview[];
  totalTables: number;
  error: string | null;
}> {
  try {
    const spec: OpenAPISpec = await getTwinSchema();
    const tableNames = Object.keys(spec.paths)
      .map((path) => path.replace(/^\//, ""))
      .filter((name) => name && !name.startsWith("rpc/"));

    const previewNames = tableNames.slice(0, limit);
    const tables = await Promise.all(
      previewNames.map(async (name) => {
        const definition = spec.definitions?.[name];
        const columns: ColumnInfo[] = definition?.properties
          ? Object.entries(definition.properties).map(
              ([columnName, columnDef]) => ({
                name: columnName,
                type: formatType(columnDef.format || columnDef.type || "unknown"),
                isPrimaryKey:
                  columnDef.description?.includes("Primary Key") ?? false,
              })
            )
          : [];

        columns.sort((left, right) => {
          if (left.isPrimaryKey && !right.isPrimaryKey) return -1;
          if (!left.isPrimaryKey && right.isPrimaryKey) return 1;
          return 0;
        });

        try {
          const sampleRows = await getTwinRows<Record<string, unknown>[]>(name, {
            params: { limit: String(MAX_VISIBLE_SAMPLE_ROWS) },
          });

          return {
            name,
            columns,
            sampleRows,
            sampleError: null,
          };
        } catch (error) {
          return {
            name,
            columns,
            sampleRows: [],
            sampleError:
              error instanceof Error
                ? error.message
                : "Failed to load table rows.",
          };
        }
      })
    );

    return {
      tables,
      totalTables: tableNames.length,
      error: null,
    };
  } catch (error) {
    return {
      tables: [],
      totalTables: 0,
      error: error instanceof Error ? error.message : "Failed to load Twin schema.",
    };
  }
}

export function formatType(raw: string): string {
  if (raw.startsWith("timestamp")) return "timestamp";
  if (raw === "integer" || raw === "bigint") return "int";
  if (raw === "double precision" || raw === "real" || raw === "numeric") {
    return "float";
  }
  if (raw === "character varying") return "text";
  if (raw === "boolean") return "bool";
  return raw;
}

export { MAX_VISIBLE_COLUMNS };
