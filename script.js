    const canvas = document.getElementById('cncCanvas');
    const ctx = canvas.getContext('2d');
    
    // Create off-screen canvas to hold wood carving memory
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = canvas.width;
    woodCanvas.height = canvas.height;
    const woodCtx = woodCanvas.getContext('2d');

    // Telemetry Elements
    const teleX = document.getElementById('tele-x');
    const teleY = document.getElementById('tele-y');
    const teleZ = document.getElementById('tele-z');

    // Machine state
    let state = {
      x: 0, y: 0, z: 5,
      feedRate: 300,
      isArc: false
    };

    let animationQueue = [];
    let isRunning = false;

    const GCODE_PRESETS = {
      // Step 1: Straight horizontal and vertical lines
      straight: `; Step 1: Straight Lines (Horizontal & Vertical)
    ; G00 = Fly fast above wood (Z > 0)
    ; G01 = Dig into wood (Z <= 0)
    
    G00 X50 Y50 Z5    ; Fly to starting point
    G01 Z-2 F200      ; Dig mandibles into wood
    
    G01 X200 Y50 F400 ; Move right (Horizontal)
    G01 X200 Y200     ; Move up (Vertical)
    G01 X50 Y200      ; Move left
    G01 X50 Y50       ; Move down back to start
    
    G00 Z5            ; Lift up and fly away!`,
    
      // Step 2: Diagonal lines
      diagonal: `; Step 2: Diagonal Lines
    ; Combining X and Y movement at the same time creates diagonals!
    
    G00 X50 Y50 Z5    ; Fly to start
    G01 Z-2 F200      ; Dig in
    
    G01 X250 Y250 F400 ; Move diagonally up-right
    G01 X50 Y250       ; Move straight left
    G01 X250 Y50       ; Move diagonally down-right
    
    G00 Z5             ; Lift up`,
    
      // Step 3: Arcs / Arches / Circles
      arcs: `; Step 3: Arcs & Arches
    ; G02 = Clockwise Arc
    ; G03 = Counter-Clockwise Arc
    ; I and J tell the beetle where the center point of the arch is!
    
    G00 X100 Y100 Z5   ; Fly to start
    G01 Z-2 F200       ; Dig in
    
    ; Cut an arch overhead (Clockwise curve to X200 Y100)
    ; I=50 J=0 means the arch center is 50 units to the right
    G02 X200 Y100 I50 J0 F300
    
    ; Cut a counter-clockwise curve (G03) back to start
    G03 X100 Y100 I-50 J0 F300
    
    G00 Z5             ; Lift up`,
    
      // Step 4: Playing with Z-Depth (Variable Dark Brown Lines)
      depth: `; Step 4: Z-Depth Digging
    ; Notice how the line gets darker and wider as Z goes deeper!
    
    G00 X50 Y150 Z5   ; Fly to start
    
    ; Shallow cut (Light Brown)
    G01 Z-1 F200      
    G01 X150 Y150 F300
    
    ; Medium cut (Deeper Brown)
    G01 Z-3
    G01 X250 Y150
    
    ; Deep cut into heartwood (Very Dark Brown & Wide)
    G01 Z-6
    G01 X350 Y150
    
    G00 Z5            ; Retract safely`
    };
    
    // Function to load presets into editor and auto-reset bed
    function loadPreset(key) {
      if (GCODE_PRESETS[key]) {
        document.getElementById('gcode').value = GCODE_PRESETS[key];
        // Trigger reset button to clear canvas for the new run
        document.getElementById('reset').click();
      }
    }

    // Reset background wood texture
    function initWoodSurface() {
      // Bark Layer
      woodCtx.fillStyle = '#4a3324';
      woodCtx.fillRect(0, 0, woodCanvas.width, woodCanvas.height);
      
      // Add wood grain texture
      woodCtx.fillStyle = 'rgba(0,0,0,0.05)';
      for(let i = 0; i < woodCanvas.height; i += 4) {
        woodCtx.fillRect(0, i, woodCanvas.width, 2);
      }
    }

    // G-code Parser
    function parseGCode(text) {
      const lines = text.split('\n');
      const commands = [];
      let currentX = state.x;
      let currentY = state.y;
      let currentZ = state.z;
      let currentF = state.feedRate;

      for (let rawLine of lines) {
        // Strip comments
        const line = rawLine.split(';')[0].split('(')[0].trim().toUpperCase();
        if (!line) continue;

        const tokens = line.match(/[A-Z][-+]?\d*\.?\d+/g) || [];
        let cmd = { type: null, x: currentX, y: currentY, z: currentZ, f: currentF, i: 0, j: 0 };
        
        let moveFound = false;
        for (let token of tokens) {
          const letter = token[0];
          const val = parseFloat(token.slice(1));

          if (letter === 'G') {
            if (val === 0) { cmd.type = 'G00'; moveFound = true; }
            if (val === 1) { cmd.type = 'G01'; moveFound = true; }
            if (val === 2) { cmd.type = 'G02'; moveFound = true; }
            if (val === 3) { cmd.type = 'G03'; moveFound = true; }
          }
          if (letter === 'X') { cmd.x = val; moveFound = true; }
          if (letter === 'Y') { cmd.y = val; moveFound = true; }
          if (letter === 'Z') { cmd.z = val; moveFound = true; }
          if (letter === 'F') { cmd.f = val; currentF = val; }
          if (letter === 'I') cmd.i = val;
          if (letter === 'J') cmd.j = val;
        }

        if (moveFound && cmd.type) {
          commands.push(cmd);
          currentX = cmd.x;
          currentY = cmd.y;
          currentZ = cmd.z;
        }
      }
      return commands;
    }

    // Execute step-by-step animation
    function runNextCommand() {
      if (animationQueue.length === 0) {
        isRunning = false;
        return;
      }

      const target = animationQueue.shift();
      const startX = state.x;
      const startY = state.y;
      const startZ = state.z;
      
      const dx = target.x - startX;
      const dy = target.y - startY;
      const dz = target.z - startZ;
      const distance = Math.hypot(dx, dy, dz);

      if (distance === 0) {
        runNextCommand();
        return;
      }

      // Calculate animation duration based on Feed Rate (F)
      const speed = target.type === 'G00' ? 8 : (target.f / 60); // pixels per frame
      const steps = Math.max(1, Math.ceil(distance / speed));
      let step = 0;

      function animate() {
        step++;
        const progress = step / steps;

        // Linear interpolation
        state.x = startX + dx * progress;
        state.y = startY + dy * progress;
        state.z = startZ + dz * progress;

        // Update UI counters
        teleX.textContent = state.x.toFixed(2);
        teleY.textContent = state.y.toFixed(2);
        teleZ.textContent = state.z.toFixed(2);

        // If digging (Z <= 0), carve into wood layer canvas
        if (state.z <= 0) {
          woodCtx.beginPath();
          // Map Z depth to groove color (deeper = darker heartwood)
/*
          const depthAlpha = Math.min(1, Math.abs(state.z) / 5);
          woodCtx.strokeStyle = `rgb(${210 - depthAlpha*80}, ${160 - depthAlpha*80}, ${110 - depthAlpha*60})`;
          woodCtx.lineWidth = 12 + Math.abs(state.z); // deeper cuts look wider */

          // Scale depth across 0 to -8mm for a wider color range
 					const depthAlpha = Math.min(1, Math.abs(state.z) / 8);
 					// Fades from light sapwood (210, 160, 110) down to dark heartwood (60, 30, 10)
 					woodCtx.strokeStyle = `rgb(${210 - depthAlpha*150}, ${160 - depthAlpha*130}, ${110 - depthAlpha*100})`;
 					woodCtx.lineWidth = 6 + Math.abs(state.z) * 1.5; // Starts narrower at shallow depths

          woodCtx.lineCap = 'round';
          woodCtx.moveTo(startX + (dx * (step - 1) / steps), startY + (dy * (step - 1) / steps));
          woodCtx.lineTo(state.x, state.y);
          woodCtx.stroke();
        }

        renderScene(Math.atan2(dy, dx));

        if (step < steps) {
          requestAnimationFrame(animate);
        } else {
          runNextCommand();
        }
      }

      animate();
    }

    // Render the main canvas view
    function renderScene(headingAngle = 0) {
      // 1. Draw carved wood layer
      ctx.drawImage(woodCanvas, 0, 0);

      // 2. Draw Beetle Sprite
      ctx.save();
      ctx.translate(state.x, state.y);

      // Scale sprite based on Z height (higher Z = beetle flies closer to camera)
      const scale = 1 + Math.max(0, state.z) * 0.05;
      ctx.scale(scale, scale);

      // Rotate towards movement direction
      ctx.rotate(headingAngle + Math.PI / 2);

      // Shadow if flying
      if (state.z > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(state.z, state.z, 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Beetle Body
      ctx.fillStyle = '#8a2be2'; // Shiny shell color (or carpenter ant brown)
      if (state.z <= 0) ctx.fillStyle = '#3b1a0e'; // Darker subterranean look

      // Shell
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(0, -12, 6, 0, Math.PI * 2);
      ctx.fill();

      // Mandibles (Cutter Bit)
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-3, -17, 4, 0, 1.5);
      ctx.arc(3, -17, 4, 1.6, 3.1);
      ctx.stroke();

      ctx.restore();
    }

    // Event Listeners
    document.getElementById('run').addEventListener('click', () => {
      if (isRunning) return;
      const code = document.getElementById('gcode').value;
      animationQueue = parseGCode(code);
      if (animationQueue.length > 0) {
        isRunning = true;
        runNextCommand();
      }
    });

    document.getElementById('reset').addEventListener('click', () => {
      isRunning = false;
      animationQueue = [];
      state = { x: 20, y: 20, z: 5, feedRate: 300 };
      initWoodSurface();
      renderScene(0);
    });

    // Boot up canvas state
    initWoodSurface();
    renderScene(0);
