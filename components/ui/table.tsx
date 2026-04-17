import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader(props: React.ComponentProps<"thead">) {
  return <thead className="[&_tr]:border-b [&_tr]:border-stone-200" {...props} />;
}

export function TableBody(props: React.ComponentProps<"tbody">) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}

export function TableRow(props: React.ComponentProps<"tr">) {
  return <tr className="border-b border-stone-100 hover:bg-stone-50" {...props} />;
}

export function TableHead(props: React.ComponentProps<"th">) {
  return (
    <th
      className="h-12 px-4 text-left align-middle font-medium text-stone-500"
      {...props}
    />
  );
}

export function TableCell(props: React.ComponentProps<"td">) {
  return <td className="p-4 align-middle" {...props} />;
}
