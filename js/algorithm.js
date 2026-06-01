    // Operaciones vectoriales básicas
    const dot = (u, v) => u[0]*v[0] + u[1]*v[1];
    const matVecMult = (A, v) => [
        A[0][0]*v[0] + A[0][1]*v[1],
        A[1][0]*v[0] + A[1][1]*v[1]
    ];
    const vecAdd = (u, v) => [u[0]+v[0], u[1]+v[1]];
    const vecSub = (u, v) => [u[0]-v[0], u[1]-v[1]];
    const vecScale = (v, s) => [v[0]*s, v[1]*s];

    function calcularGradiente() {
        const A = [
            [parseFloat(document.getElementById('a00').value), parseFloat(document.getElementById('a01').value)],
            [parseFloat(document.getElementById('a10').value), parseFloat(document.getElementById('a11').value)]
        ];
        const b = [parseFloat(document.getElementById('b0').value), parseFloat(document.getElementById('b1').value)];
        let x = [parseFloat(document.getElementById('x0').value), parseFloat(document.getElementById('x1').value)];

        const resultadosDiv = document.getElementById('resultados');
        resultadosDiv.innerHTML = ""; 
        
        // Historial para el visualizador
        let historialX = [[...x]];

        if (A[0][1] !== A[1][0]) {
            alert("Advertencia: La Matriz A no es simétrica. El método podría no funcionar.");
        }

        let r = vecSub(b, matVecMult(A, x)); // r_0
        let p = [...r];                      // p_0
        let rsold = dot(r, r);
        
        let htmlTable = `
            <table>
                <tr>
                    <th>Iteración (k)</th>
                    <th>x_k</th>
                    <th>r_k (Residuo)</th>
                    <th>‖r_k‖ (Norma)</th>
                    <th>p_k (Dirección)</th>
                    <th>α_k (Paso)</th>
                </tr>
        `;

        const max_iter = 10; 
        let k = 0;

        while (k < max_iter) {
            let Ap = matVecMult(A, p);
            let alpha = rsold / dot(p, Ap);
            
            // Imprimimos el estado actual (Fila k) incluyendo la norma de r_k
            htmlTable += `
                <tr>
                    <td>${k}</td>
                    <td>[${x[0].toFixed(4)}, ${x[1].toFixed(4)}]</td>
                    <td>[${r[0].toFixed(4)}, ${r[1].toFixed(4)}]</td>
                    <td>${Math.sqrt(rsold).toFixed(4)}</td>
                    <td>[${p[0].toFixed(4)}, ${p[1].toFixed(4)}]</td>
                    <td>${alpha.toFixed(4)}</td>
                </tr>
            `;

            // Actualizamos al siguiente paso matemático (k+1)
            x = vecAdd(x, vecScale(p, alpha));
            r = vecSub(r, vecScale(Ap, alpha));
            historialX.push([...x]); 

            let rsnew = dot(r, r);
            k++; 

            // Condición de parada con el nuevo residuo
            if (Math.sqrt(rsnew) < 1e-8) {
                htmlTable += `
                    <tr>
                        <td>${k}</td>
                        <td>[${x[0].toFixed(4)}, ${x[1].toFixed(4)}]</td>
                        <td>[${r[0].toFixed(4)}, ${r[1].toFixed(4)}]</td>
                        <td>${Math.sqrt(rsnew).toFixed(4)}</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                `;
                break; 
            }

            // Calculamos beta y la nueva dirección p_k+1
            let beta = rsnew / rsold;
            p = vecAdd(r, vecScale(p, beta));
            rsold = rsnew;
        }

        htmlTable += `</table>`;
        
        let conclusion = `<h3 style="color: var(--primary); margin-top:20px; text-align:center;">
            Resultado Final: x = [${x[0].toFixed(4)}, ${x[1].toFixed(4)}] en ${k} iteraciones.
        </h3>`;

        resultadosDiv.innerHTML = htmlTable + conclusion;
        
        // Llamar al visualizador pasando la matriz A y el vector b
        document.getElementById('visualizador').style.display = 'flex';
        dibujarTrayectoria(historialX, A, b);
    }

    // --- Motor del Visualizador Offline (Canvas) ---
    function dibujarTrayectoria(puntos, A, b) {
        const canvas = document.getElementById('plano');
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        // 1. Encontrar límites dinámicos para la escala
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        puntos.forEach(p => {
            if (p[0] < minX) minX = p[0];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[1] > maxY) maxY = p[1];
        });

        minX = Math.min(0, minX); maxX = Math.max(0, maxX);
        minY = Math.min(0, minY); maxY = Math.max(0, maxY);

        // Ajustamos márgenes un poco más amplios para ver mejor las curvas
        let rangoX = maxX - minX || 1;
        let rangoY = maxY - minY || 1;
        minX -= rangoX * 0.4; maxX += rangoX * 0.4;
        minY -= rangoY * 0.4; maxY += rangoY * 0.4;

        const scaleX = W / (maxX - minX);
        const scaleY = H / (maxY - minY);

        function alLienzo(x, y) {
            return [ (x - minX) * scaleX, H - (y - minY) * scaleY ];
        }

        // --- 1.5. Renderizar curvas de nivel de f(x) ---
        const imgData = ctx.createImageData(W, H);
        const data = imgData.data;

        // Calcular los valores de f(x) en los puntos exactos de la trayectoria
        let f_puntos = puntos.map(p => 0.5 * (A[0][0]*p[0]*p[0] + (A[0][1] + A[1][0])*p[0]*p[1] + A[1][1]*p[1]*p[1]) - (b[0]*p[0] + b[1]*p[1]));
        let minF = Math.min(...f_puntos);
        let maxF = Math.max(...f_puntos);
        
        // Creamos los niveles: incluimos los de las iteraciones para que pasen exactamente por los puntos
        let niveles = [...f_puntos];
        let elipsesExtras = 8; // Líneas de contorno adicionales para rellenar el espacio
        for (let i = 1; i <= elipsesExtras; i++) {
            niveles.push(minF + (maxF - minF) * (i / (elipsesExtras + 1)));
        }

        // Recorrido de píxeles para calcular la aproximación implícita de la elipse
        for (let y = 0; y < H; y++) {
            let my = minY + (H - y) / scaleY;
            for (let x = 0; x < W; x++) {
                let mx = minX + x / scaleX;
                
                // f(mx, my)
                let val = 0.5 * (A[0][0]*mx*mx + (A[0][1] + A[1][0])*mx*my + A[1][1]*my*my) - (b[0]*mx + b[1]*my);
                
                // Magnitud del Gradiente en el espacio de píxeles (Grosor uniforme corregido)
                let g0 = A[0][0]*mx + A[0][1]*my - b[0];
                let g1 = A[1][0]*mx + A[1][1]*my - b[1];
                let pixelGradNorm = Math.sqrt(Math.pow(g0 / scaleX, 2) + Math.pow(g1 / scaleY, 2));
                
                if (pixelGradNorm > 0) {
                    for (let lvl of niveles) {
                        // Si la distancia estimada al contorno es menor a 1 píxel, lo pintamos
                        if (Math.abs(val - lvl) / pixelGradNorm < 1.0) {
                            let idx = (y * W + x) * 4;
                            data[idx] = 180;     // R (Gris azulado suave)
                            data[idx + 1] = 200; // G
                            data[idx + 2] = 235; // B
                            data[idx + 3] = 255; // Alpha
                            break;
                        }
                    }
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);

        // 2. Dibujar Ejes X e Y (Sobre los contornos)
        ctx.beginPath();
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        let [origenX, origenY] = alLienzo(0, 0);
        
        ctx.moveTo(origenX, 0); ctx.lineTo(origenX, H);
        ctx.moveTo(0, origenY); ctx.lineTo(W, origenY);
        ctx.stroke();

        // 3. Dibujar las líneas de la trayectoria
        ctx.beginPath();
        ctx.strokeStyle = 'var(--secondary)';
        ctx.lineWidth = 2;
        puntos.forEach((p, i) => {
            let [px, py] = alLienzo(p[0], p[1]);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // 4. Dibujar los puntos y etiquetas (x0, x1, x2...)
        puntos.forEach((p, i) => {
            let [px, py] = alLienzo(p[0], p[1]);
            
            ctx.beginPath();
            ctx.fillStyle = i === puntos.length - 1 ? '#4caf50' : '#d32f2f'; 
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`x${i}`, px + 8, py - 8);
        });
    }