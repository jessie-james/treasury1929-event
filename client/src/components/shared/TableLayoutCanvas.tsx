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
  // Calculate dynamic canvas dimensions based on venue layout
  const calculateCanvasDimensions = () => {
    if (!tables.length && !stages.length) {
      return { width: 800, height: 600 };
    }

    // Find the bounds of all tables and stages
    const allObjects = [...tables, ...stages];
    const bounds = allObjects.reduce((acc, obj) => {
      const objRight = obj.x + obj.width;
      const objBottom = obj.y + obj.height;
      return {
        minX: Math.min(acc.minX, obj.x),
        minY: Math.min(acc.minY, obj.y),
        maxX: Math.max(acc.maxX, objRight),
        maxY: Math.max(acc.maxY, objBottom)
      };
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    // Add padding and ensure minimum dimensions
    const padding = 40;
    const width = Math.max(800, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(600, bounds.maxY - bounds.minY + padding * 2);

    return { width, height };
  };

  const canvasDimensions = calculateCanvasDimensions();
  
  // CRITICAL: Use identical scaling factors for both editor and booking views
  const CANVAS_CONFIG = {
    width: canvasDimensions.width,
    height: canvasDimensions.height,
    padding: 20,
    // These values MUST be identical in both editor and booking components
    tableScale: 1.0,
    stageScale: 1.0,
    gridSize: 20, // For consistent positioning
  };

  // Unified table rendering function - USE THIS IN BOTH VIEWS
  const renderTable = (table: VenueTable, index: number) => {
    const isSelected = selectedTables.includes(table.id);
    const isAvailable = table.status === 'available';
    const isOnHold = table.status === 'hold';
    const isSold = table.status === 'sold';
    const isHalf = table.shape === 'half';

    // IDENTICAL positioning calculation for both views
    const x = (table.x * CANVAS_CONFIG.tableScale) + CANVAS_CONFIG.padding;
    const y = (table.y * CANVAS_CONFIG.tableScale) + CANVAS_CONFIG.padding;
    const width = table.width * CANVAS_CONFIG.tableScale;
    const height = table.height * CANVAS_CONFIG.tableScale;
    const tableRadius = Math.min(width, height) / 2;
    const centerX = x + tableRadius;
    const centerY = y + tableRadius;
    const seatRadius = Math.max(6, tableRadius * 0.25);

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
              isSelected ? '#3b82f6' : 
              isAvailable ? '#10b981' : '#6b7280'
            }
            stroke={
              isSold ? '#dc2626' : 
              isOnHold ? '#f59e0b' : 
              isSelected ? '#2563eb' : 
              isAvailable ? '#059669' : '#4b5563'
            }
            strokeWidth="2"
            style={{ 
              cursor: isEditorMode ? 'move' : (isAvailable ? 'pointer' : 'not-allowed'),
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
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
            y={isHalf ? -tableRadius * 0.3 : 0}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.max(10, Math.min(20, tableRadius * 0.4))}
            fontWeight="bold"
            fill={isSelected ? '#ffffff' : '#374151'}
            pointerEvents="none"
          >
            {table.tableNumber}
          </text>
          
          {/* Draw seats around table */}
          {table.capacity > 0 && (
            <g>
              {Array.from({ length: table.capacity }, (_, i) => {
                let angle;
                
                if (isHalf) {
                  if (table.capacity === 1) {
                    angle = 270;
                  } else {
                    const span = Math.min(180, table.capacity * 30);
                    const startAngle = 270 - span / 2;
                    angle = startAngle + (i * span) / (table.capacity - 1);
                  }
                } else {
                  angle = (i * 360) / table.capacity;
                }
                
                const rad = (angle * Math.PI) / 180;
                const seatOffset = tableRadius + seatRadius + 2;
                const seatX = seatOffset * Math.cos(rad);
                const seatY = seatOffset * Math.sin(rad);
                
                return (
                  <g key={`seat-${i}`}>
                    <circle
                      cx={seatX}
                      cy={seatY}
                      r={seatRadius}
                      fill="#6b7280"
                      stroke="#4b5563"
                      strokeWidth="1"
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                    />
                    <text
                      x={seatX}
                      y={seatY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.max(6, Math.min(12, seatRadius * 0.8))}
                      fontWeight="bold"
                      fill="#ffffff"
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
    // IDENTICAL stage positioning calculation
    const x = (stage.x * CANVAS_CONFIG.stageScale) + CANVAS_CONFIG.padding;
    const y = (stage.y * CANVAS_CONFIG.stageScale) + CANVAS_CONFIG.padding;
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
          <g transform={`translate(${Math.max(20, CANVAS_CONFIG.width - 150)}, 20)`}>
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