import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * Public chrome for every marketing/discovery route.
 *
 * The `(marketing)` group is omitted from the URL, so `/find-tutors` and
 * `/tutors/[id]` still resolve exactly as written.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
