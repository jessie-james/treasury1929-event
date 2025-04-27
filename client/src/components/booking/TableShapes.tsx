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
      {/* Table shape exactly matching PNG - half circle table with proper proportions */}
      <svg width="60" height="40" viewBox="0 0 60 40">
        {/* Half-circle table with proportions exactly like PNG */}
        <path 
          d="M5,25 A25,25 0 0,1 55,25 L55,35 L5,35 Z" 
          fill={isSelected ? 'rgb(240, 240, 240)' : 'white'} 
          stroke="rgb(0, 0, 0)" 
          strokeWidth="0.75"
        />
        
        {/* Table number positioned as in PNG */}
        <text 
          x="30" y="31" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="8"
          fontWeight="bold"
          fill="#000000"
        >
          {tableNumber}
        </text>
        
        {/* Rectangular seats with proportions exactly as shown in PNG */}
        <rect x="14" y="8" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
        <rect x="26" y="5" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
        <rect x="38" y="8" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
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
      {/* Half-circle table shape rotated sideways - matching exactly table #7 in PNG */}
      <svg width="60" height="45" viewBox="0 0 60 45">
        {/* Half-circle table facing right exactly like in PNG */}
        <path 
          d="M10,5 L40,5 A20,17.5 0 0,1 40,40 L10,40 Z" 
          fill={isSelected ? 'rgb(240, 240, 240)' : 'white'} 
          stroke="rgb(0, 0, 0)" 
          strokeWidth="0.75"
        />
        
        {/* Table number positioned as in PNG */}
        <text 
          x="25" y="25" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="8"
          fontWeight="bold"
          fill="#000000"
        >
          {tableNumber}
        </text>
        
        {/* Rectangular seats with exact proportions from PNG */}
        <rect x="3" y="18" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
        <rect x="44" y="12" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
        <rect x="44" y="28" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
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
      {/* Triangle-shaped table (tables #23, #25, etc.) */}
      <svg width="50" height="45" viewBox="0 0 50 45">
        {/* Triangle table shape exactly as in PNG - used for tables 23, 25, etc. */}
        <path 
          d="M5,10 L45,10 L25,35 Z" 
          fill={isSelected ? 'rgb(240, 240, 240)' : 'white'} 
          stroke="rgb(0, 0, 0)" 
          strokeWidth="0.75"
        />
        
        {/* Table number positioned as in PNG */}
        <text 
          x="25" y="20" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="8"
          fontWeight="bold"
          fill="#000000"
        >
          {tableNumber}
        </text>
        
        {/* Rectangular seats with exact proportions from PNG */}
        <rect x="10" y="4" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
        <rect x="33" y="4" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
        <rect x="22" y="35" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
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
      {/* Complex shape table (like table #18) with exact proportions */}
      <svg width="60" height="50" viewBox="0 0 60 50">
        {/* Table shape matching table #18 in PNG exactly */}
        <path 
          d="M5,15 A25,15 0 0,1 55,15 L55,40 L5,40 Z" 
          fill={isSelected ? 'rgb(240, 240, 240)' : 'white'} 
          stroke="rgb(0, 0, 0)" 
          strokeWidth="0.75"
        />
        
        {/* Table number positioned as in PNG */}
        <text 
          x="30" y="28" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="8"
          fontWeight="bold"
          fill="#000000"
        >
          {tableNumber}
        </text>
        
        {/* Rectangular seats with exact proportions from PNG */}
        <rect x="5" y="10" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
        <rect x="27" y="3" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
        <rect x="48" y="10" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
        <rect x="27" y="40" width="7" height="4" fill="white" stroke="#000000" strokeWidth="0.5" />
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
  // Seat colors matching the exact seat appearance from PNG
  // while still indicating availability
  const fillColor = isSelected 
    ? "#3b82f6" // primary blue when selected
    : isAvailable 
      ? "#ffffff" // white like in PNG when available
      : "#e5e7eb"; // light gray when unavailable
  
  const strokeColor = isSelected
    ? "#1d4ed8" // darker blue for selected seats
    : "#000000"; // black outline like in PNG
  
  return (
    <div 
      className={cn("absolute", className)} 
      style={{ 
        transform: `rotate(${position}deg)`,
        ...style
      }}
    >
      <svg 
        width="12" 
        height="10" 
        viewBox="0 0 12 10" 
        className={cn(
          "cursor-pointer transition-colors",
          !isAvailable && !isSelected && "cursor-not-allowed opacity-80"
        )}
        onClick={isAvailable || isSelected ? onClick : undefined}
      >
        {/* Rectangular seat exactly matching the PNG */}
        <rect 
          x="1" 
          y="1" 
          width="10" 
          height="8" 
          rx="1"
          ry="1"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="0.5"
        />
        <text 
          x="6" 
          y="5.5" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="7" 
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