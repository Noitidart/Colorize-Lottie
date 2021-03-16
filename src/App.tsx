import './App.css';

import { isNumber, isPlainObject, set } from 'lodash';
import { useEffect, useState } from 'react';
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
    walkHelper(val, [...parentPath, key], nextNmPath, collection);
  }
}

// values of colorByPath can be falsy to no-op
function colorizeLottie(json: {}, colorByPath: Record<string, string>) {
  const nextJson = JSON.parse(JSON.stringify(json));

  Object.entries(colorByPath).forEach(([path, color]) => {
    // incase undefined/null/falsy is passed to color
    if (!color) return;
    const rgbPercentages = tinycolor(color).toPercentageRgb();
    const rFraction = parseInt(rgbPercentages.r, 10) / 100;
    const gFraction = parseInt(rgbPercentages.g, 10) / 100;
    const bFraction = parseInt(rgbPercentages.b, 10) / 100;

    const pathParts = path.split('.');
    set(nextJson, [...pathParts, 0], rFraction);
    set(nextJson, [...pathParts, 1], gFraction);
    set(nextJson, [...pathParts, 2], bFraction);
  });

  return nextJson;
}
const initalColors = walk(CircleCheckJson);
const initialLotiJsonStr = JSON.stringify(CircleCheckJson);
function App() {
  const [lottieJsonStr, setLottieJsonStr] = useState(initialLotiJsonStr);

  // lottie seems to mutate the source, so we make a copy
  const [lottieJson, setLottieJson] = useState<{}>(CircleCheckJson);
  useEffect(() => {
    setLottieJson(JSON.parse(lottieJsonStr));
    setColors(walk(JSON.parse(lottieJsonStr)));
  }, [lottieJsonStr]);

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
              const nextLottieJsonStr = e.target.value;
              try {
                JSON.parse(nextLottieJsonStr);
              } catch (error) {
                alert('Invalid JSON');
                return;
              }

              setLottieJsonStr(nextLottieJsonStr);
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
                onChange={(e) => {
                  const nextColor = tinycolor(e.target.value);
                  if (nextColor.isValid() === false) return;

                  const nextColors = colors.map((aColor) =>
                    aColor.path === color.path
                      ? { ...color, color: e.target.value }
                      : aColor
                  );

                  const nextColorByPath = nextColors.reduce(
                    (acc, color) => ({
                      ...acc,
                      [color.path]: tinycolor(color.color).toHexString(),
                    }),
                    {}
                  );
                  const nextLottieJson = colorizeLottie(
                    JSON.parse(lottieJsonStr),
                    nextColorByPath
                  );

                  setLottieJson(nextLottieJson);

                  setColors(nextColors);
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

  return <LottieView source={colorizedSource} style={{ width: 300, height: 300 }} />;
}
`}
        </pre>

        <pre className="PreBoiler">
          {`
import produce from 'immer';
import { set } from 'lodash';
import tinycolor from 'tinycolor2';

// values of colorByPath can be falsy to no-op
function colorizeLottie(json, colorByPath) {
  const nextJson = JSON.parse(JSON.stringify(json));

  Object.entries(colorByPath).forEach(([path, color]) => {
    // incase undefined/null/falsy is passed to color
    if (!color) return;
    const rgbPercentages = tinycolor(color).toPercentageRgb();
    const rFraction = parseInt(rgbPercentages.r, 10) / 100;
    const gFraction = parseInt(rgbPercentages.g, 10) / 100;
    const bFraction = parseInt(rgbPercentages.b, 10) / 100;

    const pathParts = path.split('.');
    set(nextJson, [...pathParts, 0], rFraction);
    set(nextJson, [...pathParts, 1], gFraction);
    set(nextJson, [...pathParts, 2], bFraction);
  });

  return nextJson;
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
