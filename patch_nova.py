import os

# Chemins cibles
filepath = os.path.expanduser("~/Documents/QUANTUM-NOVA/V5/engine.js")
backup_path = os.path.expanduser("~/Documents/QUANTUM-NOVA/V5/engine.js.bak")

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Création du backup de sécurité
with open(backup_path, "w", encoding="utf-8") as f:
    f.write(content)

# 2. Découpage chirurgical
separator_start = "function autoFitView(yOnly = true) {"
separator_end = "function dessiner() {"

if separator_start in content and separator_end in content:
    part1, rest = content.split(separator_start, 1)
    old_body, part2 = rest.split(separator_end, 1)

    # 3. Le nouveau moteur cinématique
    new_autofit = """let fitAnimId = null;

/**
 * Ajuste la fenêtre de vue de manière fluide (Interpolation Cinématique).
 * Maintient la mémoire spatiale de l'utilisateur lors de l'ajout de courbes.
 */
function autoFitView(yOnly = true) {
    if (fonctionsAffichees.length === 0) return;

    let targetXMin = view.xMin;
    let targetXMax = view.xMax;

    if (!yOnly) {
        targetXMin = -10;
        targetXMax = 10;
    }

    const samples = 400;
    const step = (targetXMax - targetXMin) / samples;
    const allY = [];

    for (const fn of fonctionsAffichees) {
        if (fn.implicit) continue;
        for (let i = 0; i <= samples; i++) {
            const x = targetXMin + i * step;
            try {
                const y = fn.ast.evaluate(buildScope(x));
                if (typeof y === 'number' && isFinite(y)) {
                    allY.push(y);
                }
            } catch (e) { /* Point ignoré */ }
        }
    }

    if (allY.length < 5) {
        if (!yOnly) { view.xMin = targetXMin; view.xMax = targetXMax; dessiner(); }
        return;
    }

    allY.sort((a, b) => a - b);
    const trim = Math.floor(allY.length * 0.02);
    const lo = allY[trim];
    const hi = allY[allY.length - 1 - trim];

    let targetYMin, targetYMax;
    if (hi - lo < 1e-9) {
        targetYMin = lo - 1; targetYMax = hi + 1;
    } else {
        const padding = (hi - lo) * 0.10;
        targetYMin = lo - padding; targetYMax = hi + padding;
    }

    if (targetYMin > 0 && targetYMin < (targetYMax - targetYMin) * 0.15) targetYMin = -((targetYMax - targetYMin) * 0.05);
    if (targetYMax < 0 && Math.abs(targetYMax) < (targetYMax - targetYMin) * 0.15) targetYMax = ((targetYMax - targetYMin) * 0.05);

    if (fitAnimId) cancelAnimationFrame(fitAnimId);

    const startYMin = view.yMin;
    const startYMax = view.yMax;
    const startXMin = view.xMin;
    const startXMax = view.xMax;
    const startTime = performance.now();
    const duration = 450;

    function animate(time) {
        let elapsed = time - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        const ease = 1 - Math.pow(1 - progress, 4);

        view.yMin = startYMin + (targetYMin - startYMin) * ease;
        view.yMax = startYMax + (targetYMax - startYMax) * ease;

        if (!yOnly) {
            view.xMin = startXMin + (targetXMin - startXMin) * ease;
            view.xMax = startXMax + (targetXMax - startXMax) * ease;
        }

        dessiner();

        if (progress < 1) {
            fitAnimId = requestAnimationFrame(animate);
        } else {
            fitAnimId = null;
        }
    }

    fitAnimId = requestAnimationFrame(animate);
}

function dessiner() {"""

    # 4. Écriture finale
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(part1 + new_autofit + part2)
    print("✓ Injection cinématique réussie. Backup créé : engine.js.bak")
else:
    print("Erreur : Impossible de localiser les balises de découpage.")
