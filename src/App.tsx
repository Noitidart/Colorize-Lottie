import './App.css';

import produce, { setAutoFreeze } from 'immer';
import { isNumber, isPlainObject, set } from 'lodash';
import { useState } from 'react';
import Lottie from 'react-lottie';
import tinycolor from 'tinycolor2';

import CircleCheckJson from './circle-check.json';

// get only paths that have parent of c.k
function isCKPath(path: string[]) {
  const lastIndexC = path.lastIndexOf('c');
  const lastIndexK = path.lastIndexOf('k');
  if (lastIndexC === lastIndexK - 1) {
    return true;
  } else {
    return false;
  }
}
function isColorArray(value: any[]) {
  return Array.isArray(value) && value.length === 4 && value.every(isNumber);
}

type WalkCollection = { nmPath: string; path: string; color: string }[];
function walk(obj: any) {
  const collection: WalkCollection = [];
  walkHelper(obj, [], [], collection);
  return collection;
}
function walkHelper(
  obj: any,
  parentPath: string[],
  nmPath: string[],
  collection: WalkCollection
) {
  if (Array.isArray(obj) || isPlainObject(obj)) {
    // continue
  } else {
    return;
  }
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const curPath = [...parentPath, key];
    if (isCKPath(curPath)) {
      if (isColorArray(val)) {
        const color = tinycolor
          .fromRatio({ r: val[0], g: val[1], b: val[2] })
          .setAlpha(val[3]);
        collection.push({
          // color index
          nmPath: nmPath.join('.'),
          path: curPath.join('.'),
          color: color.toHexString(),
        });
      }
    }
    const nextNmPath = val.hasOwnProperty('nm') ? [...nmPath, val.nm] : nmPath;
    // console.log('path:', [...parentPath, key].join('.'));
    walkHelper(val, [...parentPath, key], nextNmPath, collection);
  }
}

function colorizeLottie(json: {}, colorByPath: Record<string, string>) {
  // otherwise in dev mode it adds weird things to the object and it wont load in lottie
  setAutoFreeze(false);

  return produce(json, (draft) => {
    Object.entries(colorByPath).forEach(([path, color]) => {
      const rgbPercentages = tinycolor(color).toPercentageRgb();
      const rFraction = parseInt(rgbPercentages.r, 10) / 100;
      const gFraction = parseInt(rgbPercentages.g, 10) / 100;
      const bFraction = parseInt(rgbPercentages.b, 10) / 100;

      const pathParts = path.split('.');
      set(draft, [...pathParts, 0], rFraction);
      set(draft, [...pathParts, 1], gFraction);
      set(draft, [...pathParts, 2], bFraction);
    });
  });
}

const initalColors = walk(CircleCheckJson);
const initialLotiJsonStr = JSON.stringify(CircleCheckJson);
function App() {
  const [lottieJson, setLottieJson] = useState<{}>(CircleCheckJson);
  const [colors, setColors] = useState(initalColors);

  return (
    <div className="App">
      <div>
        <div>
          Lottie JSON:
          <br />
          <textarea
            rows={5}
            cols={30}
            defaultValue={initialLotiJsonStr}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setLottieJson(parsed);
                setColors(walk(parsed));
              } catch (error) {
                alert('Invalid JSON');
              }
            }}
          />
        </div>

        <br />

        {colors.map((color) => (
          <label key={color.path} className="Color">
            <div className="Color__PreviewContainer">
              <span
                className="Color__Preview"
                style={{ backgroundColor: color.color }}
              />
            </div>
            <div>
              <span className="Color__Path">{color.path}</span>
              <small className="Color__NMPath">{color.nmPath}</small>
              <input
                type="text"
                defaultValue={color.color}
                onBlur={(e) => {
                  setColors((colors) => {
                    const nextColors = colors.map((aColor) =>
                      aColor.path === color.path
                        ? { ...color, color: e.target.value }
                        : aColor
                    );

                    const nextLottieJson = colorizeLottie(
                      lottieJson,
                      nextColors.reduce(
                        (acc, color) => ({
                          ...acc,
                          [color.path]: tinycolor(color.color).toHexString(),
                        }),
                        {}
                      )
                    );

                    setTimeout(() => {
                      setLottieJson(nextLottieJson);
                    }, 0);

                    return nextColors;
                  });
                }}
              />
            </div>
          </label>
        ))}

        <pre>
          {`
function Example() {
  const colorizedSource = useMemo(() => colorizeLottie(
    LOTTIE_SOURCE,
    {
    ${colors
      .map(
        (color) =>
          `  // ${color.nmPath}
      "${color.path}": "${color.color}",`
      )
      .join('\n    ')}
    }
  ), []);

  <LottieView source={colorizedSource} />
}
`}
        </pre>

        <pre className="PreBoiler">
          {`
import produce from 'immer';
import { set } from 'lodash';
import tinycolor from 'tinycolor2';

function colorizeLottie(json, colorByPath) {
  return produce(json, (draft) => {
    Object.entries(colorByPath).forEach(([path, color]) => {
      const rgbPercentages = tinycolor(color).toPercentageRgb();
      const rFraction = parseInt(rgbPercentages.r, 10) / 100;
      const gFraction = parseInt(rgbPercentages.g, 10) / 100;
      const bFraction = parseInt(rgbPercentages.b, 10) / 100;

      const pathParts = path.split('.');
      set(draft, [...pathParts, 0], rFraction);
      set(draft, [...pathParts, 1], gFraction);
      set(draft, [...pathParts, 2], bFraction);
    });
  });
}
`}
        </pre>
      </div>
      <div>
        <div style={{ position: 'fixed' }}>
          <Lottie
            options={{
              loop: true,
              autoplay: true,
              animationData: lottieJson,
              rendererSettings: {
                preserveAspectRatio: 'xMidYMid slice',
              },
            }}
            height={400}
            width={400}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
