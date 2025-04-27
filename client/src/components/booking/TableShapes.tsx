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
      {/* Table background - Matching exactly the round table in the PNG */}
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle 
          cx="20" cy="20" r="15" 
          fill={isSelected ? 'rgb(226, 232, 240)' : 'white'} 
          stroke="rgb(0, 0, 0)" 
          strokeWidth="1"
        />
        
        {/* Table number */}
        <text 
          x="20" y="22" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="10"
          fontWeight="bold"
          fill="#000000"
        >
          {tableNumber}
        </text>
        
        {/* Small circles for seat positions exactly as shown in PNG */}
        <circle cx="20" cy="5" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="25" cy="8" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="30" cy="14" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="35" cy="20" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="30" cy="26" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="25" cy="32" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="20" cy="35" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="15" cy="32" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="10" cy="26" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="5" cy="20" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="10" cy="14" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="15" cy="8" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
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
      {/* Table background - Matching exactly the rectangular table in the PNG */}
      <svg width="45" height="30" viewBox="0 0 45 30">
        <rect 
          x="2" y="2" 
          width="41" height="26" 
          rx="2" ry="2" 
          fill={isSelected ? 'rgb(226, 232, 240)' : 'white'} 
          stroke="rgb(0, 0, 0)" 
          strokeWidth="1"
        />
        
        {/* Table number */}
        <text 
          x="22.5" y="17" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="10"
          fontWeight="bold"
          fill="#000000"
        >
          {tableNumber}
        </text>
        
        {/* Small circles for seat positions exactly as shown in PNG */}
        <circle cx="13" cy="2" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="22.5" cy="2" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="32" cy="2" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="43" cy="10" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="43" cy="20" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="32" cy="28" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="22.5" cy="28" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="13" cy="28" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="2" cy="20" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="2" cy="10" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
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
      {/* Table background - Matching exactly the square table in the PNG */}
      <svg width="35" height="35" viewBox="0 0 35 35">
        <rect 
          x="2" y="2" 
          width="31" height="31" 
          rx="2" ry="2" 
          fill={isSelected ? 'rgb(226, 232, 240)' : 'white'} 
          stroke="rgb(0, 0, 0)" 
          strokeWidth="1"
        />
        
        {/* Table number */}
        <text 
          x="17.5" y="19" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="10"
          fontWeight="bold"
          fill="#000000"
        >
          {tableNumber}
        </text>
        
        {/* Small circles for seat positions exactly as shown in PNG */}
        <circle cx="10" cy="2" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="25" cy="2" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="33" cy="10" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="33" cy="25" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="25" cy="33" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="10" cy="33" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="2" cy="25" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="2" cy="10" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
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
      {/* Table background - Matching exactly the oval table in the PNG */}
      <svg width="50" height="35" viewBox="0 0 50 35">
        <ellipse 
          cx="25" cy="17.5" rx="23" ry="15.5" 
          fill={isSelected ? 'rgb(226, 232, 240)' : 'white'} 
          stroke="rgb(0, 0, 0)" 
          strokeWidth="1"
        />
        
        {/* Table number */}
        <text 
          x="25" y="19" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="10"
          fontWeight="bold"
          fill="#000000"
        >
          {tableNumber}
        </text>
        
        {/* Small circles for seat positions exactly as shown in PNG */}
        <circle cx="13" cy="3" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="25" cy="3" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="37" cy="3" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="47" cy="12" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="47" cy="23" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="37" cy="32" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="25" cy="32" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="13" cy="32" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="3" cy="23" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
        <circle cx="3" cy="12" r="3" fill="white" stroke="#000000" strokeWidth="0.5" />
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
        width="14" 
        height="14" 
        viewBox="0 0 14 14" 
        className={cn(
          "cursor-pointer transition-colors",
          !isAvailable && !isSelected && "cursor-not-allowed opacity-80"
        )}
        onClick={isAvailable || isSelected ? onClick : undefined}
      >
        <circle 
          cx="7" 
          cy="7" 
          r="6" 
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="0.5"
        />
        <text 
          x="7" 
          y="7.5" 
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