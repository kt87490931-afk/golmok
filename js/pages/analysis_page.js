import { initPageShell, bootPage } from '../page_common.js';
import { openAnalysisPanel, initAnalysis } from '../analysis.js?v=20260629';

bootPage(() => {
  initPageShell('analysis');
  initAnalysis();
  openAnalysisPanel();
});
