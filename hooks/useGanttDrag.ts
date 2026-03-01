import { useRef, useState } from 'react';
import { addDays } from 'date-fns';

interface UseGanttDragOptions {
     /** Current anchor date for the Gantt view start */
     ganttAnchor: Date;
     /** Total calendar days visible in the Gantt */
     totalDays: number;
     /** Setter to update the anchor date */
     setGanttAnchor: (updater: (prev: Date) => Date) => void;
     /** Width of the fixed row-label column in px (default: 128) */
     labelColWidth?: number;
}

interface UseGanttDragResult {
     /** Ref to attach to the scrollable Gantt container */
     ganttBodyRef: React.RefObject<HTMLDivElement>;
     /** Whether the user is currently dragging */
     isDragging: boolean;
     /** True if the pointer has moved enough to be considered a drag (not a click) */
     hasDraggedRef: React.RefObject<boolean>;
     handleGanttMouseDown: (e: React.MouseEvent) => void;
     handleGanttMouseMove: (e: React.MouseEvent) => void;
     handleGanttMouseUp: () => void;
     handleGanttTouchStart: (e: React.TouchEvent) => void;
     handleGanttTouchMove: (e: React.TouchEvent) => void;
     handleGanttTouchEnd: () => void;
}

/** Minimum pixel movement to be considered a drag (not a click) */
const DRAG_THRESHOLD = 5;

/**
 * Custom hook that manages drag-to-pan interaction for the Gantt chart.
 * Handles both mouse and touch events and exposes event handlers to attach to
 * the scrollable container.
 */
export const useGanttDrag = ({
     ganttAnchor,
     totalDays,
     setGanttAnchor,
     labelColWidth = 128,
}: UseGanttDragOptions): UseGanttDragResult => {
     const ganttBodyRef = useRef<HTMLDivElement>(null);
     const dragRef = useRef<{ startX: number; startAnchor: Date } | null>(null);
     const hasDraggedRef = useRef(false);
     const [isDragging, setIsDragging] = useState(false);

     const calcDaysDelta = (clientX: number): number => {
          if (!dragRef.current || !ganttBodyRef.current) return 0;
          const deltaX = clientX - dragRef.current.startX;
          const colWidth = (ganttBodyRef.current.clientWidth - labelColWidth) / totalDays;
          return Math.round(-deltaX / colWidth);
     };

     const handleGanttMouseDown = (e: React.MouseEvent) => {
          e.preventDefault();
          hasDraggedRef.current = false;
          dragRef.current = { startX: e.clientX, startAnchor: ganttAnchor };
          setIsDragging(true);
     };

     const handleGanttMouseMove = (e: React.MouseEvent) => {
          if (!dragRef.current) return;
          if (Math.abs(e.clientX - dragRef.current.startX) > DRAG_THRESHOLD) {
               hasDraggedRef.current = true;
          }
          const daysDelta = calcDaysDelta(e.clientX);
          const anchor = dragRef.current.startAnchor;
          setGanttAnchor(() => addDays(anchor, daysDelta));
     };

     const handleGanttMouseUp = () => {
          dragRef.current = null;
          setIsDragging(false);
     };

     const handleGanttTouchStart = (e: React.TouchEvent) => {
          hasDraggedRef.current = false;
          dragRef.current = { startX: e.touches[0].clientX, startAnchor: ganttAnchor };
     };

     const handleGanttTouchMove = (e: React.TouchEvent) => {
          if (!dragRef.current) return;
          const clientX = e.touches[0].clientX;
          if (Math.abs(clientX - dragRef.current.startX) > DRAG_THRESHOLD) {
               hasDraggedRef.current = true;
          }
          const daysDelta = calcDaysDelta(clientX);
          const anchor = dragRef.current.startAnchor;
          setGanttAnchor(() => addDays(anchor, daysDelta));
     };

     const handleGanttTouchEnd = () => {
          dragRef.current = null;
     };

     return {
          ganttBodyRef,
          isDragging,
          hasDraggedRef,
          handleGanttMouseDown,
          handleGanttMouseMove,
          handleGanttMouseUp,
          handleGanttTouchStart,
          handleGanttTouchMove,
          handleGanttTouchEnd,
     };
};
