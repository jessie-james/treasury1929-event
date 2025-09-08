import { type Event } from "@shared/schema";
import { useLocation } from "wouter";

export function EventCard({ event }: { event: Event }) {
  const [_, setLocation] = useLocation();

  const handleClick = () => {
    setLocation(`/events/${event.id}`);
  };

  return (
    <div 
      onClick={handleClick}
      className="cursor-pointer transition-transform hover:scale-105"
      style={{
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb',
        backgroundColor: 'white'
      }}
    >
      {/* Event Image */}
      <div style={{ 
        position: 'relative',
        width: '100%', 
        height: '200px', 
        overflow: 'hidden',
        borderRadius: '8px 8px 0 0'
      }}>
        <img
          src={event.image || '/assets/placeholder-event.jpg'}
          alt={event.title || 'Event'}
          style={{ 
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            objectPosition: '50% 10%'
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/assets/placeholder-event.jpg';
          }}
        />
      </div>
      
      {/* Event Title */}
      <div style={{ padding: '1rem' }}>
        <h3 className="text-lg font-semibold text-gray-900 leading-tight">
          {event.title}
        </h3>
      </div>
    </div>
  );
}