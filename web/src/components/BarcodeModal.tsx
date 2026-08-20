'use client';

import React from 'react';
import { X, Printer, Tag, Sparkles, Check, Store } from 'lucide-react';
import { InventoryItem } from '../types';

interface BarcodeModalProps {
  item: InventoryItem | null;
  onClose: () => void;
}

export function BarcodeModal({ item, onClose }: BarcodeModalProps) {
  if (!item) return null;

  const discountPct = item.active_recommendation?.suggested_discount_pct || 
    (item.dead_stock_status === 'critical_dead' ? 35 : (item.dead_stock_status === 'slow' ? 15 : 0));
  
  const markdownPrice = (item.retail_price * (1 - discountPct / 100)).toFixed(2);
  const strategyName = item.active_recommendation?.liquidation_strategy || 'In-Store Markdown';

  const handlePrint = () => {
    window.print();
  };

  // Generate SVG barcode stripes pattern deterministically from barcode digits
  const generateBarcodeBars = (code: string) => {
    const bars = [];
    const seedStr = code + "987654321";
    let xOffset = 10;
    
    // Guard bars start
    bars.push({ x: xOffset, width: 2, height: 50 });
    bars.push({ x: xOffset + 4, width: 2, height: 50 });
    xOffset += 10;

    for (let i = 0; i < seedStr.length && xOffset < 230; i++) {
      const digit = parseInt(seedStr[i], 10) || 3;
      const width = (digit % 3) + 1;
      const isBlack = (i % 2 === 0) || (digit > 4);
      if (isBlack) {
        bars.push({ x: xOffset, width, height: 42 });
      }
      xOffset += width + (digit % 2) + 1;
    }

    // Guard bars end
    bars.push({ x: xOffset + 4, width: 2, height: 50 });
    bars.push({ x: xOffset + 8, width: 2, height: 50 });

    return bars;
  };

  const barcodeBars = generateBarcodeBars(item.barcode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">In-Store Clearance Shelf Tag</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Tag Preview */}
        <div className="p-6 space-y-6">
          <p className="text-xs text-slate-400">
            Preview generated for POS thermal barcode printers (Avery 5160 / Zebra 2x1" labels).
          </p>

          {/* Printable Tag Container */}
          <div
            id="printable-barcode-tag"
            className="bg-white text-slate-900 p-6 rounded-xl border-2 border-dashed border-slate-300 shadow-inner flex flex-col justify-between"
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3">
              <span className="font-extrabold text-xs tracking-wider uppercase font-mono bg-black text-white px-2 py-0.5 rounded">
                STOCKHOLM GOODS CO.
              </span>
              <span className="font-black text-xs text-rose-600 font-mono tracking-wide">
                {strategyName.toUpperCase()}
              </span>
            </div>

            {/* Title & SKU */}
            <div className="mb-3">
              <h4 className="font-bold text-base leading-tight text-slate-900">
                {item.title}
              </h4>
              <div className="flex items-center space-x-3 text-xs text-slate-600 font-mono mt-1">
                <span>SKU: <strong className="text-slate-900">{item.sku}</strong></span>
                <span>•</span>
                <span>CAT: {item.category}</span>
                <span>•</span>
                <span>LOC: POS #{item.channel.toUpperCase()}</span>
              </div>
            </div>

            {/* Price section */}
            <div className="my-3 p-3 bg-slate-100 rounded-lg flex items-baseline justify-between border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Original Price</span>
                <span className="text-sm font-semibold line-through text-slate-500 font-mono">
                  €{item.retail_price.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-rose-600 block">Clearance Sale Price</span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-rose-600 font-mono">
                    €{markdownPrice}
                  </span>
                  <span className="text-xs font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                    -{discountPct}% OFF
                  </span>
                </div>
              </div>
            </div>

            {/* SVG Barcode */}
            <div className="pt-2 flex flex-col items-center justify-center">
              <svg className="w-64 h-14" viewBox="0 0 260 55">
                {barcodeBars.map((bar, idx) => (
                  <rect
                    key={idx}
                    x={bar.x}
                    y={5}
                    width={bar.width}
                    height={bar.height}
                    fill="#0f172a"
                  />
                ))}
              </svg>
              <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-slate-800 -mt-1">
                {item.barcode}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Stock Qty in Store: <strong className="text-white font-mono">{item.current_stock} units</strong>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-950/50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
