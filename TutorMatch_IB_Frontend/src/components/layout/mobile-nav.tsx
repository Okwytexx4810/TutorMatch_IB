"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Logo } from "@/components/layout/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/forms/sign-out-button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { publicNavLinks, ROUTES } from "@/lib/site-config";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Mobile navigation drawer.
 *
 * The one interactive island in the public header, so `SiteHeader` can stay a
 * Server Component. Radix handles focus trapping, escape-to-close and restoring
 * focus on the trigger; every link closes the sheet on activation.
 *
 * When `account` is present the footer shows the signed-in visitor's avatar
 * (linking to their profile) and a sign-out control instead of the anonymous
 * Log in / Get started buttons.
 */
export function MobileNav({
  account,
}: {
  account?: { name: string; profileHref: Route } | null;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[85vw] max-w-sm gap-0 p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle>
            <Logo />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navigate TutorMatch IB
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="Mobile" className="flex flex-col gap-1 p-3">
          {publicNavLinks.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-[0.95rem] font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <SheetFooter className="gap-2.5 border-t p-4">
          {account ? (
            <>
              <Button variant="outline" className="h-10 w-full justify-start" asChild>
                <SheetClose asChild>
                  <Link href={account.profileHref} className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{initialsOf(account.name)}</AvatarFallback>
                    </Avatar>
                    {account.name}
                  </Link>
                </SheetClose>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <>
              <Button variant="outline" className="h-10 w-full" asChild>
                <SheetClose asChild>
                  <Link href={ROUTES.login}>Log in</Link>
                </SheetClose>
              </Button>
              <Button className="h-10 w-full" asChild>
                <SheetClose asChild>
                  <Link href={ROUTES.register}>Get started</Link>
                </SheetClose>
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
