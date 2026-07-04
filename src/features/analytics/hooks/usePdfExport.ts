import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apolloClient } from '@/lib/apollo/client';
import { GET_ALL_INSIGHTS_FOR_ANALYTICS } from '../graphql/queries';
import { fetchAdverseEvents } from '@/features/insight/services/openFDAService';
import { avgPipelineTimeDays, mostActiveHcp, type AnalyticsInsight } from '../utils/transforms';
import type { Stage } from '@/shared/types/domain';
import { STAGE_LABELS } from '@/shared/types/domain';

interface PageInfo { hasNextPage: boolean; endCursor: string }
interface ExportPage { edges: Array<{ node: AnalyticsInsight }>; pageInfo: PageInfo }

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchExportPage(
  cursor: string | null,
  filter?: Record<string, unknown>,
): Promise<ExportPage> {
  const result = await apolloClient.query<{ insightsCollection: ExportPage }>({
    query: GET_ALL_INSIGHTS_FOR_ANALYTICS,
    variables: { cursor, ...(filter ? { filter } : {}) },
    fetchPolicy: 'network-only',
  });
  return result.data.insightsCollection;
}

async function fetchAllForExport(
  dateFrom: string | null,
  dateTo: string | null,
): Promise<AnalyticsInsight[]> {
  const all: AnalyticsInsight[] = [];
  let cursor: string | null = null;

  let filter: Record<string, unknown> | undefined;
  if (dateFrom || dateTo) {
    filter = { createdAt: {} as Record<string, string> };
    if (dateFrom) (filter.createdAt as Record<string, string>).gte = `${dateFrom}T00:00:00Z`;
    if (dateTo)   (filter.createdAt as Record<string, string>).lte = `${dateTo}T23:59:59Z`;
  }

  let page: ExportPage;
  do {
    // eslint-disable-next-line no-await-in-loop
    page = await fetchExportPage(cursor, filter);
    page.edges.forEach((e) => all.push(e.node));
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor !== null);
  return all;
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

const BLUE: [number, number, number] = [63, 81, 181];
const ROW_BG: [number, number, number] = [245, 247, 255];
const ROWS_PER_PAGE = 25;

function sectionHeader(doc: jsPDF, title: string, y = 20) {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 35, 126);
  doc.text(title, 20, y);
  doc.setTextColor(0, 0, 0);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ExportOptions {
  dateFrom: string | null;
  dateTo: string | null;
}

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportPDF = useCallback(async (
    userName: string,
    options: ExportOptions = { dateFrom: null, dateTo: null },
  ) => {
    setExporting(true);
    setProgress(10);

    try {
      const { dateFrom, dateTo } = options;
      const insights = await fetchAllForExport(dateFrom, dateTo);
      setProgress(35);

      const doc = new jsPDF('p', 'mm', 'a4');

      const timestamp = new Date().toLocaleString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });

      const dateRangeLabel = dateFrom && dateTo
        ? `${dateFrom} → ${dateTo}`
        : dateFrom
        ? `From ${dateFrom}`
        : dateTo
        ? `Until ${dateTo}`
        : 'All time';

      // ── Page 1: Cover ────────────────────────────────────────────────────
      doc.setFillColor(...BLUE);
      doc.rect(0, 0, 210, 70, 'F');
      doc.setTextColor(255, 255, 255);

      doc.setFontSize(30);
      doc.setFont('helvetica', 'bold');
      doc.text('InsightBoard', 20, 32);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Field Intelligence Report', 20, 44);

      doc.setFontSize(10);
      doc.text(`Date range: ${dateRangeLabel}`, 20, 56);
      doc.text(`Generated: ${timestamp}`, 20, 63);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Prepared for: ${userName}`, 20, 82);

      // ── Page 2: KPI Summary ──────────────────────────────────────────────
      doc.addPage();
      sectionHeader(doc, 'KPI Summary');

      const avgDays = avgPipelineTimeDays(insights);
      const topHcp  = mostActiveHcp(insights);
      const stageCounts = (['observation', 'insight', 'actionable', 'impact'] as Stage[]).map((s) => [
        STAGE_LABELS[s],
        insights.filter((i) => i.stage === s).length.toString(),
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['Metric', 'Value']],
        body: [
          ['Total Insights', insights.length.toString()],
          ...stageCounts,
          ['P1 Critical', insights.filter((i) => i.priority === 'P1').length.toString()],
          ['Avg Pipeline Time', avgDays > 0 ? `${avgDays} days` : '—'],
          ['Most Active HCP', topHcp || '—'],
          ['Date Range', dateRangeLabel],
        ],
        headStyles: { fillColor: BLUE },
        alternateRowStyles: { fillColor: ROW_BG },
        columnStyles: { 0: { fontStyle: 'bold' } },
      });

      setProgress(50);

      // ── Page 3: Pipeline Funnel ──────────────────────────────────────────
      doc.addPage();
      sectionHeader(doc, 'Pipeline Funnel');

      const total = insights.length || 1;
      autoTable(doc, {
        startY: 28,
        head: [['Stage', 'Count', '% of Total']],
        body: (['observation', 'insight', 'actionable', 'impact'] as Stage[]).map((s) => {
          const count = insights.filter((i) => i.stage === s).length;
          return [STAGE_LABELS[s], count.toString(), `${Math.round((count / total) * 100)}%`];
        }),
        headStyles: { fillColor: BLUE },
        alternateRowStyles: { fillColor: ROW_BG },
      });

      setProgress(65);

      // ── Pages 4+: Insight Table (25 rows per page) ──────────────────────
      const insightRows = insights.map((i) => [
        i.title.length > 45 ? `${i.title.slice(0, 45)}…` : i.title,
        i.hcp?.name ?? '—',
        i.priority,
        i.category?.name ?? '—',
        STAGE_LABELS[i.stage],
        new Date(i.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }),
      ]);

      const chunks: typeof insightRows[] = [];
      for (let i = 0; i < insightRows.length; i += ROWS_PER_PAGE) {
        chunks.push(insightRows.slice(i, i + ROWS_PER_PAGE));
      }

      const insightHead = [['Title', 'HCP', 'Priority', 'Category', 'Stage', 'Created']];

      chunks.forEach((chunk, idx) => {
        doc.addPage();
        const pageLabel = chunks.length > 1 ? ` (${idx + 1}/${chunks.length})` : '';
        sectionHeader(doc, `All Insights${pageLabel}`);
        autoTable(doc, {
          startY: 28,
          head: insightHead,
          body: chunk,
          headStyles: { fillColor: BLUE },
          alternateRowStyles: { fillColor: ROW_BG },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 60 },
            2: { halign: 'center' },
            5: { cellWidth: 28 },
          },
        });
      });

      setProgress(80);

      // ── Drug Appendix ────────────────────────────────────────────────────
      const withDrugs = insights.filter((i) => i.drugName);
      if (withDrugs.length > 0) {
        // Unique drugs
        const uniqueDrugs = Array.from(new Set(withDrugs.map((i) => i.drugName!)));

        // Fetch adverse events for each drug in parallel (TTL cache means no extra cost for drugs seen on dashboard)
        const adverseResults = await Promise.allSettled(
          uniqueDrugs.map((drug) => fetchAdverseEvents(drug)),
        );
        setProgress(90);

        const adverseMap = new Map<string, string>(
          uniqueDrugs.map((drug, idx) => {
            const result = adverseResults[idx];
            if (result.status === 'fulfilled' && result.value.length > 0) {
              return [drug, result.value.map((e) => `${e.term} (${e.count.toLocaleString()})`).join(', ')];
            }
            return [drug, '—'];
          }),
        );

        doc.addPage();
        sectionHeader(doc, 'Drug Appendix');

        autoTable(doc, {
          startY: 28,
          head: [['Drug Name', 'Linked Insights', 'Top Adverse Reactions (FDA)']],
          body: uniqueDrugs.map((drug) => [
            drug,
            withDrugs.filter((i) => i.drugName === drug).length.toString(),
            adverseMap.get(drug) ?? '—',
          ]),
          headStyles: { fillColor: BLUE },
          alternateRowStyles: { fillColor: ROW_BG },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 110 },
          },
        });
      }

      setProgress(95);
      const safeDateLabel = dateRangeLabel.replace(/[→ ]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      doc.save(`InsightBoard-Report-${safeDateLabel}-${Date.now()}.pdf`);
      setProgress(100);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }, []);

  return { exportPDF, exporting, progress };
}
