export default function GradeBadge({ grade }: { grade: number | null }) {
  return <span className="grade-badge">{grade === null ? 'V?' : `V${grade}`}</span>
}
