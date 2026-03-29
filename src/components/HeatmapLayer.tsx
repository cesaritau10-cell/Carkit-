import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
}

export default function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    
    let heatLayer: any;
    let isMounted = true;
    let observer: ResizeObserver | null = null;

    const initHeatmap = async () => {
      // Ensure L is available globally for leaflet.heat
      if (typeof window !== 'undefined') {
        (window as any).L = L;
        await import('leaflet.heat');
      }

      if (!isMounted) return;

      const tryAddLayer = () => {
        if (!isMounted) return false;
        
        const container = map.getContainer();
        if (container.clientWidth === 0 || container.clientHeight === 0) {
          return false;
        }

        if ((L as any).heatLayer && !heatLayer) {
          heatLayer = (L as any).heatLayer(points, {
            radius: 35,
            blur: 25,
            maxZoom: 15,
            gradient: {
              0.4: 'yellow',
              0.7: 'orange',
              1.0: 'red'
            }
          }).addTo(map);
        }
        return true;
      };

      if (!tryAddLayer()) {
        observer = new ResizeObserver(() => {
          if (tryAddLayer() && observer) {
            observer.disconnect();
            observer = null;
          }
        });
        observer.observe(map.getContainer());
      }
    };

    initHeatmap();

    return () => {
      isMounted = false;
      if (observer) {
        observer.disconnect();
      }
      if (heatLayer && map) {
        try {
          map.removeLayer(heatLayer);
        } catch (e) {
          // Ignore errors if map is already destroyed
        }
      }
    };
  }, [map, points]);

  return null;
}
