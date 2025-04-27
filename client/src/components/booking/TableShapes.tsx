import React from 'react';
import { cn } from '@/lib/utils';

interface ShapeProps {
  isSelected: boolean;
  onClick?: () => void;
  tableNumber: number;
  className?: string;
}

export function RoundTable({ isSelected, onClick, tableNumber, className }: ShapeProps) {
  return (
    <div 
      className={cn(
        "relative cursor-pointer transition-all duration-200",
        isSelected ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50",
        className
      )}
      onClick={onClick}
    >
      {/* Table background */}
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle 
          cx="30" cy="30" r="28" 
          fill={isSelected ? 'rgb(226, 232, 240)' : 'white'} 
          stroke="rgb(100, 116, 139)" 
          strokeWidth="1.5"
        />
        
        {/* Table number */}
        <text 
          x="30" y="32" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          className="text-xs font-semibold"
          fill="#334155"
        >
          {tableNumber}
        </text>
        
        {/* Small circles for seat positions */}
        <circle cx="30" cy="7" r="4" fill="none" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="53" cy="30" r="4" fill="none" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="30" cy="53" r="4" fill="none" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="7" cy="30" r="4" fill="none" stroke="#94a3b8" strokeWidth="1" />
      </svg>
    </div>
  );
}

export function RectangularTable({ isSelected, onClick, tableNumber, className }: ShapeProps) {
  return (
    <div 
      className={cn(
        "relative cursor-pointer transition-all duration-200",
        isSelected ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50",
        className
      )}
      onClick={onClick}
    >
      <svg width="70" height="60" viewBox="0 0 70 60">
        <rect 
          x="1" y="1" 
          width="68" height="58" 
          rx="4" ry="4" 
          fill={isSelected ? 'rgb(226, 232, 240)' : 'white'} 
          stroke="rgb(203, 213, 225)" 
          strokeWidth="1.5"
        />
        <text 
          x="35" y="30" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          className="text-xs font-semibold"
          fill="currentColor"
        >
          {tableNumber}
        </text>
      </svg>
    </div>
  );
}

export function SquareTable({ isSelected, onClick, tableNumber, className }: ShapeProps) {
  return (
    <div 
      className={cn(
        "relative cursor-pointer transition-all duration-200",
        isSelected ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50",
        className
      )}
      onClick={onClick}
    >
      <svg width="60" height="60" viewBox="0 0 60 60">
        <rect 
          x="1" y="1" 
          width="58" height="58" 
          rx="4" ry="4" 
          fill={isSelected ? 'rgb(226, 232, 240)' : 'white'} 
          stroke="rgb(203, 213, 225)" 
          strokeWidth="1.5"
        />
        <text 
          x="30" y="30" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          className="text-xs font-semibold"
          fill="currentColor"
        >
          {tableNumber}
        </text>
      </svg>
    </div>
  );
}

export function OvalTable({ isSelected, onClick, tableNumber, className }: ShapeProps) {
  return (
    <div 
      className={cn(
        "relative cursor-pointer transition-all duration-200",
        isSelected ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50",
        className
      )}
      onClick={onClick}
    >
      <svg width="70" height="50" viewBox="0 0 70 50">
        <ellipse 
          cx="35" cy="25" rx="33" ry="23" 
          fill={isSelected ? 'rgb(226, 232, 240)' : 'white'} 
          stroke="rgb(203, 213, 225)" 
          strokeWidth="1.5"
        />
        <text 
          x="35" y="25" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          className="text-xs font-semibold"
          fill="currentColor"
        >
          {tableNumber}
        </text>
      </svg>
    </div>
  );
}

interface SeatProps {
  seatNumber: number;
  isSelected: boolean;
  isAvailable: boolean;
  onClick?: () => void;
  position: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Seat({ 
  seatNumber, 
  isSelected, 
  isAvailable, 
  onClick, 
  position,
  className,
  style
}: SeatProps) {
  const seatColor = isSelected 
    ? "fill-primary stroke-primary-foreground" 
    : isAvailable 
      ? "fill-green-100 stroke-green-500 hover:fill-green-200" 
      : "fill-gray-200 stroke-gray-500";

  return (
    <div 
      className={cn("absolute", className)} 
      style={{ 
        transform: `rotate(${position}deg)`,
        ...style
      }}
    >
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 20 20" 
        className={cn(
          "cursor-pointer transition-colors",
          !isAvailable && !isSelected && "cursor-not-allowed opacity-60"
        )}
        onClick={isAvailable || isSelected ? onClick : undefined}
      >
        <circle 
          cx="10" 
          cy="10" 
          r="9" 
          className={seatColor}
          strokeWidth="1.5"
        />
        <text 
          x="10" 
          y="10" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="10" 
          fontWeight="bold"
          fill={isSelected ? "white" : "black"}
        >
          {seatNumber}
        </text>
      </svg>
    </div>
  );
}

export function TableWithSeats({
  shape = 'round',
  tableNumber,
  seats,
  selectedSeats = [],
  isTableSelected,
  onTableSelect,
  onSeatSelect,
  className
}: {
  shape?: 'round' | 'rectangular' | 'square' | 'oval';
  tableNumber: number;
  seats: Array<{id: number, seatNumber: number, position: string, x: number, y: number, isAvailable: boolean}>;
  selectedSeats?: number[];
  isTableSelected: boolean;
  onTableSelect?: () => void;
  onSeatSelect?: (seatNumber: number, isAvailable: boolean) => void;
  className?: string;
}) {
  let TableComponent;
  
  switch (shape) {
    case 'rectangular':
      TableComponent = RectangularTable;
      break;
    case 'square':
      TableComponent = SquareTable;
      break;
    case 'oval':
      TableComponent = OvalTable;
      break;
    case 'round':
    default:
      TableComponent = RoundTable;
      break;
  }
  
  return (
    <div className={cn("relative", className)}>
      <TableComponent 
        tableNumber={tableNumber} 
        isSelected={isTableSelected}
        onClick={onTableSelect}
      />
      
      {isTableSelected && seats.map(seat => {
        // Calculate the position in degrees
        let degreePosition = 0;
        if (seat.position === 'top') degreePosition = 0;
        else if (seat.position === 'right') degreePosition = 90;
        else if (seat.position === 'bottom') degreePosition = 180;
        else if (seat.position === 'left') degreePosition = 270;
        else if (!isNaN(Number(seat.position))) degreePosition = Number(seat.position);
        
        return (
          <Seat
            key={seat.id}
            seatNumber={seat.seatNumber}
            isSelected={selectedSeats.includes(seat.seatNumber)}
            isAvailable={seat.isAvailable}
            position={degreePosition.toString()}
            onClick={() => onSeatSelect && onSeatSelect(seat.seatNumber, seat.isAvailable)}
            className={`absolute top-1/2 left-1/2 -ml-2 -mt-2`}
            style={{
              transform: `translate(${seat.x}px, ${seat.y}px)`
            }}
          />
        );
      })}
    </div>
  );
}