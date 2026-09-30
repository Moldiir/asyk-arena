import { useEffect, useRef, useState } from "react";
import "./App.css";

type Azyk = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  active: boolean;
  scored: boolean;
};

const INITIAL_AZYKS: Azyk[] = [
  { id: 1, x: 32, y: 50, vx: 0, vy: 0, rotation: -8, active: true, scored: false },
  { id: 2, x: 41, y: 50, vx: 0, vy: 0, rotation: 7, active: true, scored: false },
  { id: 3, x: 50, y: 50, vx: 0, vy: 0, rotation: -5, active: true, scored: false },
  { id: 4, x: 59, y: 50, vx: 0, vy: 0, rotation: 10, active: true, scored: false },
  { id: 5, x: 68, y: 50, vx: 0, vy: 0, rotation: -12, active: true, scored: false },
  { id: 6, x: 77, y: 50, vx: 0, vy: 0, rotation: 5, active: true, scored: false },
  { id: 7, x: 86, y: 50, vx: 0, vy: 0, rotation: -7, active: true, scored: false },
];

const FIELD_RADIUS = 44;
const AZYK_RADIUS = 3.7;
const SAKA_RADIUS = 4.8;

const FRICTION = 0.975;
const BOUNCE = 0.72;
const HIT_SPEED = 1.5;

function createAzyks(): Azyk[] {
  return INITIAL_AZYKS.map((a) => ({ ...a }));
}

function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function AzykShape({
  className = "",
  rotation = 0,
}: {
  className?: string;
  rotation?: number;
}) {
  return (
    <svg
      className={`asyk-svg ${className}`}
      viewBox="0 0 100 100"
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="asykBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d8a15d" />
          <stop offset="45%" stopColor="#a86b36" />
          <stop offset="100%" stopColor="#70401f" />
        </linearGradient>

        <linearGradient id="asykLight" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#f3c982" />
          <stop offset="100%" stopColor="#a96832" />
        </linearGradient>
      </defs>

      <path
        d="
          M 29 12
          C 34 8, 42 12, 47 19
          C 50 23, 54 23, 58 18
          C 63 11, 72 9, 76 15
          C 80 20, 75 29, 72 34
          C 69 39, 73 43, 81 47
          C 88 51, 89 59, 84 64
          C 80 68, 72 67, 66 64
          C 61 61, 58 65, 59 72
          C 60 81, 55 88, 48 88
          C 41 88, 37 80, 37 72
          C 37 66, 33 62, 28 65
          C 20 69, 12 66, 11 59
          C 10 52, 17 48, 23 45
          C 29 42, 31 38, 27 33
          C 22 27, 22 17, 29 12
          Z
        "
        fill="url(#asykBody)"
        stroke="#5c321b"
        strokeWidth="3"
      />

      <path
        d="M 31 16 C 37 11, 43 16, 47 23 C 43 27, 37 28, 32 24 C 29 22, 28 19, 31 16Z"
        fill="url(#asykLight)"
        opacity="0.9"
      />

      <ellipse
        cx="43"
        cy="38"
        rx="12"
        ry="6"
        fill="#f6d59a"
        opacity="0.35"
        transform="rotate(-25 43 38)"
      />

      <path
        d="M 48 29 C 57 33, 63 42, 61 51 C 59 59, 52 64, 44 61 C 39 58, 37 51, 40 44 C 42 39, 44 34, 48 29Z"
        fill="#6b3c20"
        opacity="0.25"
      />

      <path
        d="M 67 22 C 72 19, 75 23, 73 28 C 71 31, 68 34, 65 32 C 63 29, 64 25, 67 22Z"
        fill="#f2c77e"
        opacity="0.55"
      />
    </svg>
  );
}

function App() {
  const [azyks, setAzyks] = useState<Azyk[]>(createAzyks);
  const [direction, setDirection] = useState(0);
  const [power, setPower] = useState(65);
  const [throwsLeft, setThrowsLeft] = useState(5);
  const [score, setScore] = useState(0);

  const [bestScore, setBestScore] = useState(() => {
    return Number(localStorage.getItem("asyk-best-score") || 0);
  });

  const [message, setMessage] = useState("Асықтарды көзде!");
  const [gameOver, setGameOver] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const animationRef = useRef<number | null>(null);
  const latestAzyks = useRef<Azyk[]>(azyks);

  useEffect(() => {
    latestAzyks.current = azyks;
  }, [azyks]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const updatePhysics = (
    current: Azyk[],
    saka: {
      x: number;
      y: number;
      vx: number;
      vy: number;
    },
    hitIds: number[]
  ) => {
    const objects = current.map((a) => ({ ...a }));
    const newSaka = { ...saka };

    // =========================
    // ДВИЖЕНИЕ АСЫКОВ
    // =========================

    for (const a of objects) {
      if (!a.active) continue;

      a.x += a.vx;
      a.y += a.vy;

      a.vx *= FRICTION;
      a.vy *= FRICTION;

      const centerDistance = distance(a.x, a.y, 50, 50);

      // Асық реально вышел за круг
      if (centerDistance > FIELD_RADIUS + AZYK_RADIUS) {
        a.active = false;

        // За один асық очки можно получить только один раз
        if (!a.scored && hitIds.includes(a.id)) {
          a.scored = true;
        }
      }
    }

    // =========================
    // ДВИЖЕНИЕ САҚА
    // =========================

    newSaka.x += newSaka.vx;
    newSaka.y += newSaka.vy;

    newSaka.vx *= FRICTION;
    newSaka.vy *= FRICTION;

    const sakaDistance = distance(
      newSaka.x,
      newSaka.y,
      50,
      50
    );

    const sakaMaxDistance = FIELD_RADIUS - SAKA_RADIUS;

    if (sakaDistance > sakaMaxDistance) {
      const nx = (newSaka.x - 50) / sakaDistance;
      const ny = (newSaka.y - 50) / sakaDistance;

      newSaka.x = 50 + nx * sakaMaxDistance;
      newSaka.y = 50 + ny * sakaMaxDistance;

      const dot =
        newSaka.vx * nx +
        newSaka.vy * ny;

      newSaka.vx =
        newSaka.vx - 2 * dot * nx;

      newSaka.vy =
        newSaka.vy - 2 * dot * ny;

      newSaka.vx *= BOUNCE;
      newSaka.vy *= BOUNCE;
    }

    // =========================
    // СТОЛКНОВЕНИЕ САҚА + АСЫҚ
    // =========================

    for (const a of objects) {
      if (!a.active) continue;

      const dx = a.x - newSaka.x;
      const dy = a.y - newSaka.y;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDistance =
        AZYK_RADIUS + SAKA_RADIUS;

      if (dist < minDistance) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);

        const relativeVx =
          newSaka.vx - a.vx;

        const relativeVy =
          newSaka.vy - a.vy;

        const relativeSpeed =
          relativeVx * nx +
          relativeVy * ny;

        if (relativeSpeed > 0) {
          const impactSpeed = Math.sqrt(
            newSaka.vx ** 2 +
            newSaka.vy ** 2
          );

          /*
           * Регистрируем именно прямое
           * попадание сақи.
           */
          if (
            impactSpeed >= HIT_SPEED &&
            !hitIds.includes(a.id)
          ) {
            hitIds.push(a.id);

            /*
             * Передаём асыку основную силу удара.
             *
             * Теперь сила задаётся только здесь,
             * а не второй раз в throwSaka.
             */
            const hitPower =
              Math.max(impactSpeed, 1.8);

            a.vx =
              nx *
              hitPower *
              1.35;

            a.vy =
              ny *
              hitPower *
              1.35;
          } else {
            /*
             * Если удар слабый —
             * асық только немного двигается.
             */
            const lightImpulse =
              Math.min(relativeSpeed, 0.5);

            a.vx += nx * lightImpulse;
            a.vy += ny * lightImpulse;
          }

          /*
           * Сақа теряет часть скорости
           * после столкновения.
           */
          const impulse =
            relativeSpeed * 0.7;

          newSaka.vx -=
            impulse * nx;

          newSaka.vy -=
            impulse * ny;
        }

        // Убираем наложение объектов
        const overlap =
          minDistance - dist;

        newSaka.x -=
          nx * overlap * 0.45;

        newSaka.y -=
          ny * overlap * 0.45;

        a.x +=
          nx * overlap * 0.55;

        a.y +=
          ny * overlap * 0.55;
      }
    }

    // =========================
    // СТОЛКНОВЕНИЯ АСЫК + АСЫК
    // =========================

    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i];
        const b = objects[j];

        if (!a.active || !b.active) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const dist = Math.sqrt(
          dx * dx + dy * dy
        );

        const minDistance =
          AZYK_RADIUS * 2;

        if (dist < minDistance) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);

          const relativeVx =
            b.vx - a.vx;

          const relativeVy =
            b.vy - a.vy;

          const relativeSpeed =
            relativeVx * nx +
            relativeVy * ny;

          if (relativeSpeed < 0) {
            /*
             * Слабая передача движения.
             *
             * Это позволяет соседнему асыку
             * немного двигаться, но не создаёт
             * огромную цепную реакцию.
             */
            const impulse =
              -relativeSpeed * 0.18;

            a.vx -= impulse * nx;
            a.vy -= impulse * ny;

            b.vx += impulse * nx;
            b.vy += impulse * ny;
          }

          const overlap =
            minDistance - dist;

          a.x -=
            nx * overlap * 0.5;

          a.y -=
            ny * overlap * 0.5;

          b.x +=
            nx * overlap * 0.5;

          b.y +=
            ny * overlap * 0.5;
        }
      }
    }

    return {
      objects,
      newSaka,
    };
  };

  // =========================
  // ЛАҚТЫРУ
  // =========================

  const throwSaka = () => {
    if (
      throwsLeft <= 0 ||
      gameOver ||
      isMoving
    ) {
      return;
    }

    setIsMoving(true);
    setMessage("Лақтыру!");

    const angle =
      (direction * Math.PI) / 180;

    const startX =
      50 +
      Math.sin(angle) * 35;

    const startY =
      87 -
      Math.cos(angle) * 3;

    const speed =
      0.9 +
      (power / 100) * 2.2;

    let saka = {
      x: startX,
      y: startY,
      vx:
        Math.sin(angle) * speed,
      vy:
        -Math.cos(angle) * speed,
    };

    let objects =
      latestAzyks.current.map((a) => ({
        ...a,
      }));

    // Асыки, по которым был прямой удар
    const hitIds: number[] = [];

    let frames = 0;

    const animate = () => {
      frames++;

      const result =
        updatePhysics(
          objects,
          saka,
          hitIds
        );

      objects =
        result.objects;

      saka =
        result.newSaka;

      // Проверяем, какие асыки реально вышли
      for (const a of objects) {
        if (!a.active) continue;

        const d = distance(
          a.x,
          a.y,
          50,
          50
        );

        if (
          d >
          FIELD_RADIUS +
            AZYK_RADIUS
        ) {
          a.active = false;
        }
      }

      setAzyks(objects);

      const sakaSpeed =
        Math.sqrt(
          saka.vx ** 2 +
          saka.vy ** 2
        );

      const azykStillMoving =
        objects.some((a) => {
          if (!a.active) return false;

          const speed =
            Math.sqrt(
              a.vx ** 2 +
              a.vy ** 2
            );

          return speed > 0.04;
        });

      if (
        frames < 240 &&
        (
          sakaSpeed > 0.04 ||
          azykStillMoving
        )
      ) {
        animationRef.current =
          requestAnimationFrame(
            animate
          );
      } else {
        /*
         * Считаем только те асыки,
         * которые:
         *
         * 1. получили прямой удар;
         * 2. реально вышли за круг;
         * 3. ещё не были засчитаны.
         */
        const removedThisThrow =
          objects.filter(
            (a) =>
              !a.active &&
              hitIds.includes(a.id) &&
              a.scored
          ).length;

        if (
          removedThisThrow > 0
        ) {
          setScore((old) => {
            const newScore =
              old +
              removedThisThrow * 10;

            if (
              newScore >
              bestScore
            ) {
              setBestScore(
                newScore
              );

              localStorage.setItem(
                "asyk-best-score",
                String(newScore)
              );
            }

            return newScore;
          });

          setMessage(
            removedThisThrow === 1
              ? "Жарайсың! Асық шеңберден шықты +10"
              : `${removedThisThrow} асық шеңберден шықты! +${
                  removedThisThrow * 10
                }`
          );
        } else if (
          hitIds.length > 0
        ) {
          setMessage(
            "Асыққа тиді, бірақ ол шеңберден шықпады. 0 ұпай!"
          );
        } else {
          setMessage(
            "Асық тимеді. Келесі мүмкіндік!"
          );
        }

        setThrowsLeft((old) => {
          const remaining =
            old - 1;

          if (
            remaining === 0
          ) {
            setGameOver(true);
            setMessage(
              "Ойын аяқталды!"
            );
          }

          return remaining;
        });

        setIsMoving(false);
      }
    };

    animationRef.current =
      requestAnimationFrame(
        animate
      );
  };

  // =========================
  // ҚАЙТА ОЙНАУ
  // =========================

  const restartGame = () => {
    if (animationRef.current) {
      cancelAnimationFrame(
        animationRef.current
      );
    }

    const fresh =
      createAzyks();

    setAzyks(fresh);

    latestAzyks.current =
      fresh;

    setThrowsLeft(5);
    setScore(0);
    setDirection(0);
    setPower(65);
    setMessage(
      "Асықтарды көзде!"
    );
    setGameOver(false);
    setIsMoving(false);
  };

  const activeCount =
    azyks.filter(
      (a) => a.active
    ).length;

  return (
    <main className="game-page">
      <div className="background-decoration decoration-one" />
      <div className="background-decoration decoration-two" />

      <section className="game-shell">

        <header className="game-header">
          <div>
            <div className="eyebrow">
              ҰЛТТЫҚ ОЙЫН
            </div>

            <h1>АСЫҚ</h1>

            <p>
              Дәл көзде. Күшті лақтыр. Асықты ал.
            </p>
          </div>

          <div className="score-card">
            <span>ҰПАЙ</span>
            <strong>{score}</strong>
          </div>
        </header>

        <div className="game-layout">

          <section className="field-section">

            <div className="field-wrapper">
              <div className="field-shadow" />

              <div className="game-field">

                <div className="field-inner-line" />

                <div className="field-center-mark">
                  <span />
                </div>

                {!gameOver && (
                  <div
                    className="aim-line"
                    style={{
                      transform:
                        `translateX(-50%) rotate(${direction}deg)`,
                    }}
                  >
                    <div
                      className="aim-arrow"
                      style={{
                        height:
                          `${30 + power * 0.35}%`,
                      }}
                    />
                  </div>
                )}

                {azyks.map((a) => {
                  if (!a.active) {
                    return null;
                  }

                  return (
                    <div
                      key={a.id}
                      className="field-asyk"
                      style={{
                        left: `${a.x}%`,
                        top: `${a.y}%`,
                        transform:
                          "translate(-50%, -50%)",
                      }}
                    >
                      <AzykShape
                        rotation={
                          a.rotation
                        }
                      />
                    </div>
                  );
                })}

                {!gameOver && (
                  <div
                    className="saka"
                    style={{
                      left:
                        `${
                          50 +
                          Math.sin(
                            (direction *
                              Math.PI) /
                              180
                          ) *
                            35
                        }%`,

                      top:
                        `${
                          87 -
                          Math.cos(
                            (direction *
                              Math.PI) /
                              180
                          ) *
                            3
                        }%`,
                    }}
                  >
                    <AzykShape
                      className="saka-shape"
                      rotation={
                        direction *
                        0.25
                      }
                    />

                    <span className="saka-label">
                      САҚА
                    </span>
                  </div>
                )}

                <div className="field-label field-label-top">
                  АСЫҚТАР
                </div>

                <div className="field-label field-label-bottom">
                  САҚА
                </div>

              </div>
            </div>

            <div className="message-box">
              <span className="message-dot" />
              {message}
            </div>

          </section>

          <aside className="control-panel">

            <div className="panel-top">
              <div>
                <span className="small-label">
                  ҚАЛҒАН БРОСОК
                </span>

                <div className="throws">
                  {Array.from({
                    length: 5,
                  }).map(
                    (_, index) => (
                      <span
                        key={index}
                        className={
                          index <
                          throwsLeft
                            ? "throw-dot active"
                            : "throw-dot"
                        }
                      />
                    )
                  )}
                </div>
              </div>

              <div className="remaining">
                <strong>
                  {activeCount}
                </strong>

                <span>
                  асық
                </span>
              </div>
            </div>

            <div className="control">

              <div className="control-heading">
                <label>
                  БАҒЫТЫ
                </label>

                <span>
                  {direction}°
                </span>
              </div>

              <input
                type="range"
                min="-28"
                max="28"
                value={direction}
                disabled={
                  isMoving ||
                  gameOver
                }
                onChange={(e) =>
                  setDirection(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="slider direction-slider"
              />

              <div className="range-labels">
                <span>←</span>
                <span>ОРТАЛЫҚ</span>
                <span>→</span>
              </div>
            </div>

            <div className="control">

              <div className="control-heading">
                <label>
                  КҮШІ
                </label>

                <span>
                  {power}%
                </span>
              </div>

              <input
                type="range"
                min="20"
                max="100"
                value={power}
                disabled={
                  isMoving ||
                  gameOver
                }
                onChange={(e) =>
                  setPower(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="slider power-slider"
              />

              <div className="range-labels">
                <span>ӘЛСІЗ</span>
                <span>ОРТА</span>
                <span>КҮШТІ</span>
              </div>
            </div>

            <button
              className="throw-button"
              onClick={throwSaka}
              disabled={
                throwsLeft <= 0 ||
                gameOver ||
                isMoving
              }
            >
              <span>
                ЛАҚТЫРУ
              </span>

              <span className="button-arrow">
                ↗
              </span>
            </button>

            <div className="score-info">

              <div>
                <span>
                  ҚАЗІРГІ ҰПАЙ
                </span>

                <strong>
                  {score}
                </strong>
              </div>

              <div>
                <span>
                  ҮЗДІК НӘТИЖЕ
                </span>

                <strong>
                  {bestScore}
                </strong>
              </div>

            </div>

            <div className="rules">

              <div className="rules-title">
                ОЙЫН ЕРЕЖЕСІ
              </div>

              <div className="rule">
                <span>01</span>
                <p>
                  Бағыт пен күшті таңда.
                </p>
              </div>

              <div className="rule">
                <span>02</span>
                <p>
                  Сақаны асықтарға дәл тигіз.
                </p>
              </div>

              <div className="rule">
                <span>03</span>
                <p>
                  Асықты шеңберден шығарсаң
                  +10 ұпай.
                </p>
              </div>

            </div>

          </aside>
        </div>

        {gameOver && (
          <div className="result-overlay">

            <div className="result-card">

              <div className="result-icon">
                <AzykShape
                  rotation={-8}
                />
              </div>

              <span className="result-small">
                ОЙЫН АЯҚТАЛДЫ
              </span>

              <h2>
                ЖАРАЙСЫҢ!
              </h2>

              <div className="final-score">
                <span>
                  СЕНІҢ НӘТИЖЕҢ
                </span>

                <strong>
                  {score}
                </strong>

                <small>
                  ҰПАЙ
                </small>
              </div>

              {score >= bestScore &&
                score > 0 && (
                  <div className="new-record">
                    ★ ЖАҢА ҮЗДІК НӘТИЖЕ!
                  </div>
                )}

              <button
                className="restart-button"
                onClick={
                  restartGame
                }
              >
                ҚАЙТА ОЙНАУ
              </button>

            </div>
          </div>
        )}

      </section>
    </main>
  );
}

export default App;