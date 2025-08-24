import PDFDocument from "pdfkit";
// @ts-expect-error - no types available for svg-to-pdfkit
import svgToPdf from "svg-to-pdfkit";
import type { Dungeon } from "../../core/types";
import type {
  ExportPlugin,
  ExportOptions,
  ExportResult,
  PluginMetadata,
} from "../../core/plugin-types";
import svgExportPlugin from "../svg-export";

export interface PdfExportOptions extends ExportOptions {
  pageSize?: "a4" | "letter" | "legal";
  layout?: "map-only" | "with-keys" | "detailed";
  colorMode?: "color" | "monochrome";
}

export const metadata: PluginMetadata = {
  id: "pdf-export",
  version: "1.0.0",
  description: "Export dungeons as print-friendly PDF documents",
  author: "DOA Community",
  tags: ["export", "pdf", "print", "tabletop"],
};

export const pdfExportPlugin: ExportPlugin = {
  metadata,
  supportedFormats: ["pdf"],

  async export(
    dungeon: Dungeon,
    format: string,
    options?: PdfExportOptions,
  ): Promise<ExportResult> {
    if (!this.supportedFormats.includes(format)) {
      throw new Error(
        `Unsupported format: ${format}. Supported formats: ${this.supportedFormats.join(", ")}`,
      );
    }

    const pageSize = options?.pageSize?.toUpperCase() || "LETTER";
    const doc = new PDFDocument({ size: pageSize });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const svgResult = await svgExportPlugin.export(dungeon, 'svg', { theme: 'light', showGrid: false });
    const svg = svgResult.data as string;
    svgToPdf(doc, svg, 0, 0);

    if (options?.layout && options.layout !== "map-only") {
      doc.addPage();
      doc.fontSize(16).text("Room Keys", { underline: true });
      dungeon.rooms.forEach((r, i) => {
        const desc = r.description || r.kind;
        doc
          .moveDown(0.5)
          .fontSize(12)
          .text(`${i + 1}. Room ${r.id}: ${desc}`);
      });
    }

    doc.end();
    await new Promise((resolve) => doc.on("end", resolve));
    const data = Buffer.concat(chunks);

    return {
      format,
      data,
      contentType: "application/pdf",
      filename: options?.filename || "dungeon.pdf",
    };
  },

  initialize() {},

  cleanup() {},

  getDefaultConfig() {
    return {
      pageSize: "letter",
      layout: "map-only",
      colorMode: "color",
    };
  },
};

export default pdfExportPlugin;
