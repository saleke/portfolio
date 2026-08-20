type SectionHeadingProps = { id: string; index: string; title: string; intro?: string };

export function SectionHeading({ id, index, title, intro }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <p className="section-index">{index}</p>
      <div>
        <h2 id={id}>{title}</h2>
        {intro ? <p className="section-intro">{intro}</p> : null}
      </div>
    </div>
  );
}
