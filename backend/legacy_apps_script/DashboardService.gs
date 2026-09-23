/************************************************************
 * AI RESUME INTERVIEW SYSTEM
 * DashboardService.gs
 *
 * Aggregates dashboard statistics.
 ************************************************************/


function getDashboardData() {

  const candidates = getAllInterviewData();

  let selected = 0;
  let rejected = 0;
  let pending  = 0;

  candidates.forEach(c => {
    const status = String(c["Final Status"] || "").trim().toLowerCase();
    if (status === "selected" || status === "select") {
      selected++;
    } else if (status === "rejected" || status === "reject") {
      rejected++;
    } else {
      pending++;
    }
  });

  return {
    total:      candidates.length,
    selected:   selected,
    rejected:   rejected,
    pending:    pending,
    candidates: candidates
  };

}

