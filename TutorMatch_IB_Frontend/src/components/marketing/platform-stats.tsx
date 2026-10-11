import { platformStats, platformStatsDisclosure } from "@/lib/mock-data/platform";

/**
 * Platform highlights band.
 *
 * The figures are illustrative sample values from `@/lib/mock-data/platform`,
 * not measured metrics. The disclosure line below them is required, not
 * optional — do not remove it without replacing the data with real counts.
 */
export function PlatformStats() {
  return (
    <section className="bg-brand-navy-deep">
      <div className="container-page py-14 lg:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-brand-emerald uppercase">
            Platform highlights
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            A marketplace built around how people actually learn.
          </h2>
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {platformStats.map((stat) => (
            <div
              key={stat.id}
              className="border-l-2 border-white/15 pl-4 sm:pl-5"
            >
              <dt className="text-sm font-medium text-white/70">
                {stat.label}
              </dt>
              <dd className="mt-1.5">
                <span className="block text-3xl font-semibold tracking-tight text-white tabular-nums sm:text-4xl">
                  {stat.value}
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-white/55">
                  {stat.description}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 border-t border-white/10 pt-5 text-xs text-white/45">
          {platformStatsDisclosure}
        </p>
      </div>
    </section>
  );
}
