/**
 * Central dispatcher for item visuals.
 *
 * Given an `ItemVisual` (or null), picks the right renderer. Every new visual
 * variant should:
 *   1. Be added to the `ItemVisual` union in `types/index.ts`
 *   2. Have a dedicated component under `src/components/visuals/`
 *   3. Be registered in the switch below
 *
 * All visuals render into the item card in `PracticeItemView` and are
 * rendered whenever the item's CPA layer is `pictorial` or `concrete`.
 * Abstract-layer items pass `visual: null` and this component returns null.
 */
import type { ItemVisual } from '../../types';
import { FractionCircles } from './FractionCircles';
import { FractionBar }     from './FractionBar';
import { DotArray }        from './DotArray';
import { BaseTenBlocks }   from './BaseTenBlocks';
import { BarModel }        from './BarModel';
import { NumberLine }      from './NumberLine';
import { AnalogClock }     from './AnalogClock';

interface Props {
  visual: ItemVisual | null | undefined;
}

export function VisualRenderer({ visual }: Props) {
  if (!visual) return null;

  switch (visual.type) {
    case 'fraction_circles':
      return (
        <FractionCircles
          partsA={visual.partsA}
          labelA={visual.labelA}
          partsB={visual.partsB}
          labelB={visual.labelB}
        />
      );
    case 'fraction_bar':
      return (
        <FractionBar
          parts={visual.parts}
          highlighted={visual.highlighted}
          total={visual.total}
        />
      );
    case 'dot_array':
      return (
        <DotArray
          rows={visual.rows}
          cols={visual.cols}
          highlighted={visual.highlighted}
        />
      );
    case 'base10_blocks':
      return (
        <BaseTenBlocks
          hundreds={visual.hundreds}
          tens={visual.tens}
          ones={visual.ones}
          regroupLabel={visual.regroupLabel}
        />
      );
    case 'bar_model':
      return <BarModel rows={visual.rows} />;
    case 'number_line':
      return (
        <NumberLine
          min={visual.min}
          max={visual.max}
          step={visual.step}
          from={visual.from}
          to={visual.to}
          arrowLabel={visual.arrowLabel}
        />
      );
    case 'analog_clock':
      return <AnalogClock time={visual.time} elapsedMin={visual.elapsedMin} />;
  }
}
