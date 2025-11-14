export function normalizeVisit(raw: string) {
  if (!raw) return { value: "", label: "" };

  let v = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const opNumberMatch = v.match(/(?:op|operation)?\s*(\d+)/);
  const opNumber = opNumberMatch ? parseInt(opNumberMatch[1]) : 1;

  const isPre = v.includes("pre");
  const isPost = v.includes("post");

  const day = v.match(/(\d+)\s*days?/);
  const month = v.match(/(\d+)\s*months?/);
  const week = v.match(/(\d+)\s*weeks?/);
  const year = v.match(/(\d+)\s*years?/);

  // ---- PRE-OP ----
  if (isPre && !day && !month && !week && !year) {
    const value = opNumber > 1 ? `pre_op_${opNumber}` : "pre_op";
    const label = opNumber > 1 ? `Pre-Op (${opNumber})` : "Pre-Op";
    return { value, label };
  }

  // ---- POST-OP ----
  if (isPost && !day && !month && !week && !year) {
    const value = opNumber > 1 ? `post_op_${opNumber}` : "post_op";
    const label = opNumber > 1 ? `Post-Op (${opNumber})` : "Post-Op";
    return { value, label };
  }

  // ---- DAYS ----
  if (day) {
    const n = parseInt(day[1]);
    const value = opNumber > 1 ? `${n}d_after_op${opNumber}` : `${n}d`;
    const label = `${n} day${n > 1 ? "s" : ""}`;
    return { value, label };
  }

  // ---- WEEKS ----
  if (week) {
    const n = parseInt(week[1]);
    const value = opNumber > 1 ? `${n}w_after_op${opNumber}` : `${n}w`;
    const label = `${n} week${n > 1 ? "s" : ""}`;
    return { value, label };
  }

  // ---- MONTHS ----
  if (month) {
    const n = parseInt(month[1]);
    const value = opNumber > 1 ? `${n}m_after_op${opNumber}` : `${n}m`;
    const label = `${n} month${n > 1 ? "s" : ""}`;
    return { value, label };
  }

  // ---- YEARS ----
  if (year) {
    const n = parseInt(year[1]);
    const value = opNumber > 1 ? `${n}y_after_op${opNumber}` : `${n}y`;
    const label = `${n} year${n > 1 ? "s" : ""}`;
    return { value, label };
  }

  return {
    value: v.replace(/\s+/g, "_"),
    label: v.replace(/\s+/g, " ").toUpperCase(),
  };
}
