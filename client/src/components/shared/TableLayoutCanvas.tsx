import React from 'react';

interface VenueTable {
  id: number;
  tableNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  shape: 'full' | 'half';
  rotation: number;
  status: 'available' | 'sold' | 'hold';
  tableSize?: number; // Added to match venue designer
}

interface Stage {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface TableLayoutCanvasProps {
  tables: VenueTable[];
  stages?: Stage[];
  isEditorMode?: boolean;
  onTableSelect?: (table: VenueTable) => void;
  selectedTables?: number[];
  className?: string;
}

// TABLE LAYOUT CONSISTENCY FIX
// This component ensures identical table rendering between venue editor and ticket selection
export const TableLayoutCanvas: React.FC<TableLayoutCanvasProps> = ({ 
  tables, 
  stages = [], 
  isEditorMode = false, 
  onTableSelect, 
  selectedTables = [],
  className = ""
}) => {
  // CRITICAL: Use EXACT same coordinate system as venue editor
  // The venue editor uses a 1000x800 canvas, so we must match this exactly
  const CANVAS_CONFIG = {
    width: 1000,
    height: 800,
    padding: 0, // No padding to match venue editor exactly
    // These values MUST be identical in both editor and booking components
    tableScale: 1.0,
    stageScale: 1.0,
    gridSize: 20, // For consistent positioning
  };

  // EXACT same table dimension calculation as VenueLayoutDesigner
  const getTableDimensions = (tableSize: number) => {
    const sizeConfig = {
      1: { tableRadius: 18, seatRadius: 6,  gap: 6  }, // Small
      2: { tableRadius: 22, seatRadius: 7,  gap: 7  }, // Medium  
      3: { tableRadius: 26, seatRadius: 9,  gap: 9  }, // Large
      4: { tableRadius: 30, seatRadius: 10, gap: 10 }  // Extra Large
    };
    
    return sizeConfig[tableSize as keyof typeof sizeConfig] || sizeConfig[4];
  };

  // Unified table rendering function - USE THIS IN BOTH VIEWS
  const renderTable = (table: VenueTable, index: number) => {
    const isSelected = selectedTables.includes(table.id);
    const isAvailable = table.status === 'available';
    const isOnHold = table.status === 'hold';
    const isSold = table.status === 'sold';
    const isHalf = table.shape === 'half';

    // CRITICAL FIX: Map database dimensions to VenueLayoutDesigner tableSize system
    // The database stores width/height, but we need to convert to tableSize (1-4)
    let mappedTableSize;
    const dbWidth = table.width || 60;
    
    if (dbWidth <= 50) {
      mappedTableSize = 1; // Small tables (40-50px width)
    } else if (dbWidth <= 70) {
      mappedTableSize = 2; // Medium tables (60-70px width) 
    } else if (dbWidth <= 90) {
      mappedTableSize = 3; // Large tables (72-88px width)
    } else {
      mappedTableSize = 4; // Extra large tables (>90px width)
    }
    
    const dimensions = getTableDimensions(mappedTableSize);
    const { tableRadius, seatRadius } = dimensions;
    
    // Use exact coordinates from venue editor (no scaling needed)
    const x = table.x;
    const y = table.y;
    const centerX = x + tableRadius;
    const centerY = y + tableRadius;

    return (
      <g key={`table-${table.id}`}>
        {/* Table circle/half-circle - IDENTICAL styling */}
        <g transform={`translate(${centerX}, ${centerY}) rotate(${table.rotation})`}>
          <circle
            cx={0}
            cy={0}
            r={tableRadius}
            fill={
              isSold ? '#ef4444' : 
              isOnHold ? '#fbbf24' : 
              isSelected ? '#22c55e' : 
              isAvailable ? '#28a745' : '#6b7280'
            }
            stroke={
              isSold ? '#dc2626' : 
              isOnHold ? '#f59e0b' : 
              isSelected ? '#16a34a' : 
              isAvailable ? '#1e7e34' : '#4b5563'
            }
            strokeWidth="2"
            style={{ 
              cursor: isEditorMode ? 'move' : (isAvailable ? 'pointer' : 'not-allowed'),
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}
            onClick={() => {
              if (!isEditorMode && isAvailable && onTableSelect) {
                onTableSelect(table);
              }
            }}
            clipPath={isHalf ? `url(#half-circle-${table.id})` : undefined}
          />
          
          {/* Half-circle clipping path */}
          {isHalf && (
            <defs>
              <clipPath id={`half-circle-${table.id}`}>
                <path d={`M -${tableRadius} 0 A ${tableRadius} ${tableRadius} 0 0 1 ${tableRadius} 0 Z`} />
              </clipPath>
            </defs>
          )}
          
          {/* Table number - IDENTICAL text positioning */}
          <text
            x={0}
            y={isHalf ? -tableRadius * 0.5 : 0}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.max(12, Math.min(24, 10 + mappedTableSize * 1.5))}
            fontWeight="bold"
            fill="#333"
            pointerEvents="none"
          >
            {table.tableNumber}
          </text>
          
          {/* Draw seats around table - EXACT same logic as VenueLayoutDesigner */}
          {table.capacity > 0 && (
            <g>
              {Array.from({ length: table.capacity }, (_, i) => {
                let angle;
                const count = Math.max(1, Math.min(8, table.capacity)); // 1-8 seats allowed
                
                if (isHalf) {
                  // Half Circle Tables - Smart positioning (matching VenueLayoutDesigner exactly)
                  if (count === 1) {
                    angle = 270; // Single seat at the back center
                  } else if (count === 2) {
                    const angles = [225, 315]; // 90° total spread
                    angle = angles[i];
                  } else if (count === 3) {
                    const angles = [220, 270, 320]; // 100° total spread
                    angle = angles[i];
                  } else {
                    // 4+ seats: use 40° spacing method
                    const totalSpan = (count - 1) * 40;
                    const startAngle = 270 - (totalSpan / 2);
                    angle = startAngle + (i * 40);
                  }
                } else {
                  // Full Circle Tables - Even distribution
                  angle = i * (360 / count); // Evenly spaced around 360°
                }
                
                const rad = (angle * Math.PI) / 180;
                const seatOffset = tableRadius + seatRadius; // Seats touch table edge
                const seatX = seatOffset * Math.cos(rad);
                const seatY = seatOffset * Math.sin(rad);
                
                return (
                  <g key={`seat-${i}`}>
                    <circle
                      cx={seatX}
                      cy={seatY}
                      r={seatRadius}
                      fill="#6B7280"
                      stroke="#4B5563"
                      strokeWidth="1"
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
                    />
                    <text
                      x={seatX}
                      y={seatY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.max(8, Math.min(16, seatRadius - 4))}
                      fontWeight="bold"
                      fill="white"
                      pointerEvents="none"
                    >
                      {i + 1}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
          
          {/* Selection indicator */}
          {isSelected && (
            <circle
              cx={0}
              cy={0}
              r={tableRadius + 6}
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="3"
              strokeDasharray="8,4"
              clipPath={isHalf ? `url(#half-circle-selection-${table.id})` : undefined}
            />
          )}
          
          {/* Half-circle selection clipping path */}
          {isHalf && isSelected && (
            <defs>
              <clipPath id={`half-circle-selection-${table.id}`}>
                <path d={`M -${tableRadius + 6} 0 A ${tableRadius + 6} ${tableRadius + 6} 0 0 1 ${tableRadius + 6} 0 Z`} />
              </clipPath>
            </defs>
          )}
        </g>
      </g>
    );
  };

  // Unified stage rendering function - USE THIS IN BOTH VIEWS
  const renderStage = (stage: Stage, index: number) => {
    // IDENTICAL stage positioning calculation - use exact coordinates from venue editor
    const x = stage.x * CANVAS_CONFIG.stageScale;
    const y = stage.y * CANVAS_CONFIG.stageScale;
    const width = stage.width * CANVAS_CONFIG.stageScale;
    const height = stage.height * CANVAS_CONFIG.stageScale;

    return (
      <g key={`stage-${stage.id}`}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#374151"
          stroke="#1f2937"
          strokeWidth="3"
          rx="8"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="16"
          fontWeight="bold"
          fill="white"
          pointerEvents="none"
        >
          STAGE
        </text>
      </g>
    );
  };

  return (
    <div className={`table-layout-canvas w-full ${className}`}>
      <svg 
        width="100%" 
        height={CANVAS_CONFIG.height}
        viewBox={`0 0 ${CANVAS_CONFIG.width} ${CANVAS_CONFIG.height}`}
        style={{ 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          background: '#f9fafb',
          maxWidth: '100%',
          height: 'auto',
          minHeight: '400px'
        }}
      >
        {/* Render stages first (background) */}
        {stages.map((stage, index) => renderStage(stage, index))}
        
        {/* Render all tables with IDENTICAL positioning */}
        {tables.map((table, index) => renderTable(table, index))}
        
        {/* Legend - only show in booking mode */}
        {!isEditorMode && (
          <g transform={`translate(${CANVAS_CONFIG.width - 150}, 20)`}>
            <rect x="0" y="0" width="130" height="80" fill="white" stroke="#d1d5db" strokeWidth="1" rx="4" />
            <text x="10" y="15" fontSize="12" fontWeight="bold" fill="#374151">Legend:</text>
            <circle cx="15" cy="28" r="6" fill="#10b981" />
            <text x="25" y="32" fontSize="10" fill="#374151">Available</text>
            <circle cx="15" cy="43" r="6" fill="#fbbf24" />
            <text x="25" y="47" fontSize="10" fill="#374151">On Hold</text>
            <circle cx="15" cy="58" r="6" fill="#ef4444" />
            <text x="25" y="62" fontSize="10" fill="#374151">Sold</text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default TableLayoutCanvas;