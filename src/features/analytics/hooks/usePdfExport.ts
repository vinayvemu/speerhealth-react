import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apolloClient } from '@/lib/apollo/client';
import { GET_ALL_INSIGHTS_FOR_ANALYTICS } from '../graphql/queries';
import type { AnalyticsInsight } from '../utils/transforms';
import type { Stage } from '@/shared/types/domain';
import { STAGE_LABELS } from '@/shared/types/domain';

interface PageInfo { hasNextPage: boolean; endCursor: string }

async function fetchAllForExport(): Promise<AnalyticsInsight[]> {
  const all: AnalyticsInsight[] = [];
  let cursor: string | null = null;
  do {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await apolloClient.query<{
      insightsCollection: { edges: Array<{ node: AnalyticsInsight }>; pageInfo: PageInfo };
    }>({ query: GET_ALL_INSIGHTS_FOR_ANALYTICS, variables: { cursor }, fetchPolicy: 'network-only' });
    all.push(...data.insightsCollection.edges.map((e) => e.node));
    cursor = data.insightsCollection.pageInfo.hasNextPage ? data.insightsCollection.pageInfo.endCursor : null;
  } while (cursor !== null);
  return all;
}

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportPDF = useCallback(async (userName: string) => {
    setExporting(true);
    setProgress(10);

    try {
      const insights = await fetchAllForExport();
      setProgress(40);

      const doc = new jsPDF('p', 'mm', 'a4');
      const now = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

      // ── Page 1: Cover ──────────────────────────────────────────────────
      doc.setFillColor(63, 81, 181);
      doc.rect(0, 0, 210, 60, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('InsightBoard', 20, 30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Field Intelligence Report', 20, 42);
      doc.setFontSize(10);
      doc.text(`Generated: ${now} | ${userName}`, 20, 54);
      doc.setTextColor(0, 0, 0);

      // ── Page 2: KPI Summary ────────────────────────────────────────────
      doc.addPage();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('KPI Summary', 20, 20);

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
        ],
        headStyles: { fillColor: [63, 81, 181] },
        alternateRowStyles: { fillColor: [245, 247, 255] },
      });

      setProgress(60);

      // ── Page 3: Pipeline Funnel ────────────────────────────────────────
      doc.addPage();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Pipeline Funnel', 20, 20);
      autoTable(doc, {
        startY: 28,
        head: [['Stage', 'Count', '% of Total']],
        body: (['observation', 'insight', 'actionable', 'impact'] as Stage[]).map((s) => {
          const count = insights.filter((i) => i.stage === s).length;
          return [STAGE_LABELS[s], count.toString(), `${Math.round(count / insights.length * 100)}%`];
        }),
        headStyles: { fillColor: [63, 81, 181] },
      });

      // ── Pages 4+: Insight Table ────────────────────────────────────────
      doc.addPage();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('All Insights', 20, 20);
      autoTable(doc, {
        startY: 28,
        head: [['Title', 'HCP', 'Priority', 'Category', 'Stage', 'Created']],
        body: insights.map((i) => [
          i.title.slice(0, 40),
          i.hcp?.name ?? '—',
          i.priority,
          i.category?.name ?? '—',
          STAGE_LABELS[i.stage],
          new Date(i.createdAt).toLocaleDateString(),
        ]),
        headStyles: { fillColor: [63, 81, 181] },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        styles: { fontSize: 8, cellPadding: 2 },
        rowPageBreak: 'auto',
      });

      setProgress(80);

      // ── Drug Appendix ──────────────────────────────────────────────────
      const withDrugs = insights.filter((i) => i.drugName);
      if (withDrugs.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Drug Appendix', 20, 20);
        autoTable(doc, {
          startY: 28,
          head: [['Drug Name', 'Linked Insights']],
          body: Array.from(new Map(withDrugs.map((i) => [i.drugName!, withDrugs.filter((x) => x.drugName === i.drugName).length])).entries())
            .map(([drug, count]) => [drug, count.toString()]),
          headStyles: { fillColor: [63, 81, 181] },
        });
      }

      setProgress(95);
      doc.save(`InsightBoard-Report-${Date.now()}.pdf`);
      setProgress(100);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }, []);

  return { exportPDF, exporting, progress };
}
