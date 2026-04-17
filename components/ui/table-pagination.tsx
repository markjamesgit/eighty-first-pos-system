"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageSizeChange,
}: TablePaginationProps) {
  if (!totalItems) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col items-start justify-between gap-3 bg-transparent px-8 py-4 transition-all sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Rows</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="h-8 w-[110px] rounded-lg border-stone-200 bg-white px-2 text-xs font-semibold text-stone-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-sm">
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <p className="text-xs font-black uppercase tracking-widest text-stone-400">
        Record <span className="text-stone-900">{startIdx}</span>-<span className="text-stone-900">{endIdx}</span> of <span className="text-stone-900">{totalItems}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl border border-stone-100 bg-white shadow-sm hover:bg-stone-900 hover:text-white transition-all disabled:opacity-30"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5 px-3">
          <span className="text-[11px] font-black text-stone-950">
            {currentPage}
          </span>
          <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
            / {totalPages}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl border border-stone-100 bg-white shadow-sm hover:bg-stone-900 hover:text-white transition-all disabled:opacity-30"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
