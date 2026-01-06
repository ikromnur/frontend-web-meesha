"use client";

import React from "react";
import logo from "../../../public/logomeeshatext.svg";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { IoMenu } from "react-icons/io5";
import { TbShoppingBag } from "react-icons/tb";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "@/components/container/notification-dropdown";
import { navigation } from "@/data/navigation";
import { useSession, signOut } from "next-auth/react";
import { UseGetCart } from "@/features/cart/api/use-get-cart";
import { Cart } from "@/types/cart";

const Navigation = ({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "aside";
}) => {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <ul
      className={cn(
        "items-center hidden gap-4 justify-between w-full lg:flex max-w-[384px]",
        className
      )}
    >
      {navigation.map((item) => {
        const isActive = pathname === item.href;

        return (
          <li
            key={item.name}
            className={variant === "aside" ? "w-full" : "mx-4"}
          >
            <Button
              onClick={() => router.push(item.href)}
              variant={
                isActive
                  ? "default"
                  : variant === "aside"
                  ? "secondary"
                  : "ghost"
              }
              size={variant === "aside" ? "lg" : "default"}
              className={`hover:bg-primary hover:text-primary-foreground ${
                isActive ? "bg-primary text-primary-foreground" : ""
              } ${variant === "aside" ? "w-full" : ""}`}
            >
              {item.name}
            </Button>
          </li>
        );
      })}
    </ul>
  );
};

const DefaultHeader = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const { data: cartData } = UseGetCart({
    onError(e) {
      console.error("Failed to fetch cart:", e.message);
    },
    enabled: Boolean(session?.accessToken),
  });

  const cartItemCount = Array.isArray(cartData)
    ? cartData.reduce((total: number, item: Cart) => total + item.quantity, 0)
    : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "Good Morning!";
    if (hour >= 11 && hour < 15) return "Good Afternoon!";
    if (hour >= 15 && hour < 18) return "Good Evening!";
    return "Good Night!";
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white z-50 shadow">
      <div className="flex items-center justify-between w-full max-w-screen-xl mx-auto p-4">
        {/* Logo */}
        <Link href="/">
          <Image
            width={200}
            height={100}
            src={logo}
            alt="logo"
            priority
            className="w-[195.45px] h-auto"
          />
        </Link>

        {/* Navigation */}
        <Navigation />

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          {session && <NotificationDropdown />}

          {/* Cart */}
          <div className="relative">
            <Button
              onClick={() => router.push("/cart")}
              size="icon"
              variant="secondary"
              className="rounded-full"
            >
              <TbShoppingBag />
            </Button>
            {cartItemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 text-[10px] px-1 py-1 w-5 h-5 flex items-center justify-center rounded-full"
              >
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </Badge>
            )}
          </div>

          {/* Auth */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer">
                  <Avatar>
                    <AvatarImage
                      src={(function () {
                        const backendUrl =
                          process.env.NEXT_PUBLIC_BACKEND_URL || "";
                        const img = user?.image;
                        if (!img) return "/default-profile.png";
                        if (/^https?:\/\//.test(img)) return img;
                        return `${backendUrl}${
                          img.startsWith("/") ? "" : "/"
                        }${img}`;
                      })()}
                      alt={user?.name || user?.username || "User"}
                    />
                    <AvatarFallback>
                      {(user?.name || user?.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-col hidden md:flex">
                    <span className="text-sm font-semibold">
                      {user?.name || user?.username || "User"}
                    </span>
                    <span className="text-xs text-[#C0C3C6]">
                      {getGreeting()}
                    </span>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/history")}>
                  Riwayat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" onClick={() => router.push("/login")}>
              Login
            </Button>
          )}

          {/* Sidebar Mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="lg:hidden">
                <IoMenu />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <Navigation className="flex-col mt-4 flex" variant="aside" />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default DefaultHeader;
