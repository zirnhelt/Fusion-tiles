import React, { useState, useEffect } from 'react';
import { Atom, RotateCcw, Trophy, Lightbulb, Zap, AlertTriangle, FlaskConical } from 'lucide-react';

// All 118 elements with atomic weights (rounded to nearest integer)
const ELEMENTS = [
  { symbol: 'H', name: 'Hydrogen', number: 1, weight: 1, color: '#E8F4F8' },
  { symbol: 'He', name: 'Helium', number: 2, weight: 4, color: '#D5E8F7' },
  { symbol: 'Li', name: 'Lithium', number: 3, weight: 7, color: '#FFE5E5' },
  { symbol: 'Be', name: 'Beryllium', number: 4, weight: 9, color: '#F0E68C' },
  { symbol: 'B', name: 'Boron', number: 5, weight: 11, color: '#DDA15E' },
  { symbol: 'C', name: 'Carbon', number: 6, weight: 12, color: '#C9C9C9' },
  { symbol: 'N', name: 'Nitrogen', number: 7, weight: 14, color: '#B4D7FF' },
  { symbol: 'O', name: 'Oxygen', number: 8, weight: 16, color: '#FFD1D1' },
  { symbol: 'F', name: 'Fluorine', number: 9, weight: 19, color: '#D4F1D4' },
  { symbol: 'Ne', name: 'Neon', number: 10, weight: 20, color: '#FFCCE5' },
  { symbol: 'Na', name: 'Sodium', number: 11, weight: 23, color: '#FFE8A3' },
  { symbol: 'Mg', name: 'Magnesium', number: 12, weight: 24, color: '#E6E6E6' },
  { symbol: 'Al', name: 'Aluminum', number: 13, weight: 27, color: '#D4D4FF' },
  { symbol: 'Si', name: 'Silicon', number: 14, weight: 28, color: '#C8B8A8' },
  { symbol: 'P', name: 'Phosphorus', number: 15, weight: 31, color: '#FFD4AA' },
  { symbol: 'S', name: 'Sulfur', number: 16, weight: 32, color: '#FFFFAA' },
  { symbol: 'Cl', name: 'Chlorine', number: 17, weight: 35, color: '#D4FFD4' },
  { symbol: 'Ar', name: 'Argon', number: 18, weight: 40, color: '#E5CCFF' },
  { symbol: 'K', name: 'Potassium', number: 19, weight: 39, color: '#FFE5CC' },
  { symbol: 'Ca', name: 'Calcium', number: 20, weight: 40, color: '#F0F0F0' },
  { symbol: 'Sc', name: 'Scandium', number: 21, weight: 45, color: '#FFE4E1' },
  { symbol: 'Ti', name: 'Titanium', number: 22, weight: 48, color: '#C0C0C0' },
  { symbol: 'V', name: 'Vanadium', number: 23, weight: 51, color: '#A6A6D2' },
  { symbol: 'Cr', name: 'Chromium', number: 24, weight: 52, color: '#8C92AC' },
  { symbol: 'Mn', name: 'Manganese', number: 25, weight: 55, color: '#9C88AA' },
  { symbol: 'Fe', name: 'Iron', number: 26, weight: 56, color: '#E06633' },
  { symbol: 'Co', name: 'Cobalt', number: 27, weight: 59, color: '#F090A0' },
  { symbol: 'Ni', name: 'Nickel', number: 28, weight: 59, color: '#50D050' },
  { symbol: 'Cu', name: 'Copper', number: 29, weight: 64, color: '#C88033' },
  { symbol: 'Zn', name: 'Zinc', number: 30, weight: 65, color: '#7D80B0' },
  { symbol: 'Ga', name: 'Gallium', number: 31, weight: 70, color: '#C28F8F' },
  { symbol: 'Ge', name: 'Germanium', number: 32, weight: 73, color: '#668F8F' },
  { symbol: 'As', name: 'Arsenic', number: 33, weight: 75, color: '#BD80E3' },
  { symbol: 'Se', name: 'Selenium', number: 34, weight: 79, color: '#FFA100' },
  { symbol: 'Br', name: 'Bromine', number: 35, weight: 80, color: '#A62929' },
  { symbol: 'Kr', name: 'Krypton', number: 36, weight: 84, color: '#5CB8D1' },
  { symbol: 'Rb', name: 'Rubidium', number: 37, weight: 85, color: '#702EB0' },
  { symbol: 'Sr', name: 'Strontium', number: 38, weight: 88, color: '#00FF00' },
  { symbol: 'Y', name: 'Yttrium', number: 39, weight: 89, color: '#94FFFF' },
  { symbol: 'Zr', name: 'Zirconium', number: 40, weight: 91, color: '#94E0E0' },
  { symbol: 'Nb', name: 'Niobium', number: 41, weight: 93, color: '#73C2C9' },
  { symbol: 'Mo', name: 'Molybdenum', number: 42, weight: 96, color: '#54B5B5' },
  { symbol: 'Tc', name: 'Technetium', number: 43, weight: 98, color: '#3B9E9E' },
  { symbol: 'Ru', name: 'Ruthenium', number: 44, weight: 101, color: '#248F8F' },
  { symbol: 'Rh', name: 'Rhodium', number: 45, weight: 103, color: '#0A7D8C' },
  { symbol: 'Pd', name: 'Palladium', number: 46, weight: 106, color: '#006985' },
  { symbol: 'Ag', name: 'Silver', number: 47, weight: 108, color: '#C0C0C0' },
  { symbol: 'Cd', name: 'Cadmium', number: 48, weight: 112, color: '#FFD98F' },
  { symbol: 'In', name: 'Indium', number: 49, weight: 115, color: '#A67573' },
  { symbol: 'Sn', name: 'Tin', number: 50, weight: 119, color: '#668080' },
  { symbol: 'Sb', name: 'Antimony', number: 51, weight: 122, color: '#9E63B5' },
  { symbol: 'Te', name: 'Tellurium', number: 52, weight: 128, color: '#D47A00' },
  { symbol: 'I', name: 'Iodine', number: 53, weight: 127, color: '#940094' },
  { symbol: 'Xe', name: 'Xenon', number: 54, weight: 131, color: '#429EB0' },
  { symbol: 'Cs', name: 'Cesium', number: 55, weight: 133, color: '#57178F' },
  { symbol: 'Ba', name: 'Barium', number: 56, weight: 137, color: '#00C900' },
  { symbol: 'La', name: 'Lanthanum', number: 57, weight: 139, color: '#70D4FF' },
  { symbol: 'Ce', name: 'Cerium', number: 58, weight: 140, color: '#FFFFC7' },
  { symbol: 'Pr', name: 'Praseodymium', number: 59, weight: 141, color: '#D9FFC7' },
  { symbol: 'Nd', name: 'Neodymium', number: 60, weight: 144, color: '#C7FFC7' },
  { symbol: 'Pm', name: 'Promethium', number: 61, weight: 145, color: '#A3FFC7' },
  { symbol: 'Sm', name: 'Samarium', number: 62, weight: 150, color: '#8FFFC7' },
  { symbol: 'Eu', name: 'Europium', number: 63, weight: 152, color: '#61FFC7' },
  { symbol: 'Gd', name: 'Gadolinium', number: 64, weight: 157, color: '#45FFC7' },
  { symbol: 'Tb', name: 'Terbium', number: 65, weight: 159, color: '#30FFC7' },
  { symbol: 'Dy', name: 'Dysprosium', number: 66, weight: 163, color: '#1FFFC7' },
  { symbol: 'Ho', name: 'Holmium', number: 67, weight: 165, color: '#00FF9C' },
  { symbol: 'Er', name: 'Erbium', number: 68, weight: 167, color: '#00E675' },
  { symbol: 'Tm', name: 'Thulium', number: 69, weight: 169, color: '#00D452' },
  { symbol: 'Yb', name: 'Ytterbium', number: 70, weight: 173, color: '#00BF38' },
  { symbol: 'Lu', name: 'Lutetium', number: 71, weight: 175, color: '#00AB24' },
  { symbol: 'Hf', name: 'Hafnium', number: 72, weight: 178, color: '#4DC2FF' },
  { symbol: 'Ta', name: 'Tantalum', number: 73, weight: 181, color: '#4DA6FF' },
  { symbol: 'W', name: 'Tungsten', number: 74, weight: 184, color: '#2194D6' },
  { symbol: 'Re', name: 'Rhenium', number: 75, weight: 186, color: '#267DAB' },
  { symbol: 'Os', name: 'Osmium', number: 76, weight: 190, color: '#266696' },
  { symbol: 'Ir', name: 'Iridium', number: 77, weight: 192, color: '#175487' },
  { symbol: 'Pt', name: 'Platinum', number: 78, weight: 195, color: '#D0D0E0' },
  { symbol: 'Au', name: 'Gold', number: 79, weight: 197, color: '#FFD123' },
  { symbol: 'Hg', name: 'Mercury', number: 80, weight: 201, color: '#B8B8D0' },
  { symbol: 'Tl', name: 'Thallium', number: 81, weight: 204, color: '#A6544D' },
  { symbol: 'Pb', name: 'Lead', number: 82, weight: 207, color: '#575961' },
  { symbol: 'Bi', name: 'Bismuth', number: 83, weight: 209, color: '#9E4FB5' },
  { symbol: 'Po', name: 'Polonium', number: 84, weight: 209, color: '#AB5C00' },
  { symbol: 'At', name: 'Astatine', number: 85, weight: 210, color: '#754F45' },
  { symbol: 'Rn', name: 'Radon', number: 86, weight: 222, color: '#428296' },
  { symbol: 'Fr', name: 'Francium', number: 87, weight: 223, color: '#420066' },
  { symbol: 'Ra', name: 'Radium', number: 88, weight: 226, color: '#007D00' },
  { symbol: 'Ac', name: 'Actinium', number: 89, weight: 227, color: '#70ABFA' },
  { symbol: 'Th', name: 'Thorium', number: 90, weight: 232, color: '#00BAFF' },
  { symbol: 'Pa', name: 'Protactinium', number: 91, weight: 231, color: '#00A1FF' },
  { symbol: 'U', name: 'Uranium', number: 92, weight: 238, color: '#008FFF' },
  { symbol: 'Np', name: 'Neptunium', number: 93, weight: 237, color: '#0080FF' },
  { symbol: 'Pu', name: 'Plutonium', number: 94, weight: 244, color: '#006BFF' },
  { symbol: 'Am', name: 'Americium', number: 95, weight: 243, color: '#545CF2' },
  { symbol: 'Cm', name: 'Curium', number: 96, weight: 247, color: '#785CE3' },
  { symbol: 'Bk', name: 'Berkelium', number: 97, weight: 247, color: '#8A4FE3' },
  { symbol: 'Cf', name: 'Californium', number: 98, weight: 251, color: '#A136D4' },
  { symbol: 'Es', name: 'Einsteinium', number: 99, weight: 252, color: '#B31FD4' },
  { symbol: 'Fm', name: 'Fermium', number: 100, weight: 257, color: '#B31FBA' },
  { symbol: 'Md', name: 'Mendelevium', number: 101, weight: 258, color: '#B30DA6' },
  { symbol: 'No', name: 'Nobelium', number: 102, weight: 259, color: '#BD0D87' },
  { symbol: 'Lr', name: 'Lawrencium', number: 103, weight: 262, color: '#C70066' },
  { symbol: 'Rf', name: 'Rutherfordium', number: 104, weight: 267, color: '#CC0059' },
  { symbol: 'Db', name: 'Dubnium', number: 105, weight: 268, color: '#D1004F' },
  { symbol: 'Sg', name: 'Seaborgium', number: 106, weight: 271, color: '#D90045' },
  { symbol: 'Bh', name: 'Bohrium', number: 107, weight: 272, color: '#E00038' },
  { symbol: 'Hs', name: 'Hassium', number: 108, weight: 270, color: '#E6002E' },
  { symbol: 'Mt', name: 'Meitnerium', number: 109, weight: 276, color: '#EB0026' },
  { symbol: 'Ds', name: 'Darmstadtium', number: 110, weight: 281, color: '#FF0000' },
  { symbol: 'Rg', name: 'Roentgenium', number: 111, weight: 280, color: '#FF1A00' },
  { symbol: 'Cn', name: 'Copernicium', number: 112, weight: 285, color: '#FF3300' },
  { symbol: 'Nh', name: 'Nihonium', number: 113, weight: 284, color: '#FF4D00' },
  { symbol: 'Fl', name: 'Flerovium', number: 114, weight: 289, color: '#FF6600' },
  { symbol: 'Mc', name: 'Moscovium', number: 115, weight: 288, color: '#FF8000' },
  { symbol: 'Lv', name: 'Livermorium', number: 116, weight: 293, color: '#FF9900' },
  { symbol: 'Ts', name: 'Tennessine', number: 117, weight: 294, color: '#FFB300' },
  { symbol: 'Og', name: 'Oganesson', number: 118, weight: 294, color: '#FFCC00' },
];

const GRID_SIZE = 6;

export default function ElementSwapGame() {
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState(40);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');
  const [animating, setAnimating] = useState(false);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [hintCells, setHintCells] = useState([]);
  const [targetCell, setTargetCell] = useState(null);
  const [nukeMode, setNukeMode] = useState(false);
  const [nukeTarget, setNukeTarget] = useState(null);
  const [catalystMode, setCatalystMode] = useState(false);
  const [catalystTarget, setCatalystTarget] = useState(null);
  const [seenElements, setSeenElements] = useState([]);
  const [eliminatedElements, setEliminatedElements] = useState(new Set());

  useEffect(() => {
    resetGame();
    const saved = localStorage.getItem('elementSwapHighScore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const createRandomGrid = () => {
    const newGrid = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const row = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        // Avoid creating 3-in-a-row while building the grid to reduce
        // the number of rejection retries needed in resetGame()
        const forbidden = new Set();
        if (j >= 2 && row[j - 1] === row[j - 2]) forbidden.add(row[j - 1]);
        if (i >= 2 && newGrid[i - 1][j] === newGrid[i - 2][j]) forbidden.add(newGrid[i - 1][j]);

        let value;
        let tries = 0;
        do {
          value = Math.floor(Math.random() * 4) + 1;
          tries++;
        } while (forbidden.has(value) && tries < 20);
        row.push(value);
      }
      newGrid.push(row);
    }
    return newGrid;
  };

  const getDepositionRange = (grid) => {
    // Find highest element on board
    let maxElement = 1;
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (grid[i][j] && grid[i][j] > maxElement) {
          maxElement = grid[i][j];
        }
      }
    }

    // Deposition range shifts up slowly as you progress
    // Every 8 elements unlocked, increase minimum deposition by 1
    const minDeposition = Math.max(1, Math.floor(maxElement / 8));
    const maxDeposition = Math.min(minDeposition + 4, ELEMENTS.length); // Range of 5 elements

    return { min: minDeposition, max: maxDeposition };
  };

  // Remove elements that have fallen below the current deposition minimum,
  // but only if there are fewer than 3 on the board (≥3 can still form a match).
  // Returns { cleaned, removed } where removed is the list of retired element numbers.
  const cleanupObsoleteElements = (grid) => {
    const { min: minDeposition } = getDepositionRange(grid);
    if (minDeposition <= 1) return { cleaned: false, removed: [] };

    let cleaned = false;
    const removed = [];
    for (let elementNum = 1; elementNum < minDeposition; elementNum++) {
      let count = 0;
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          if (grid[i][j] === elementNum) count++;
        }
      }
      if (count > 0 && count < 3) {
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = 0; j < GRID_SIZE; j++) {
            if (grid[i][j] === elementNum) {
              grid[i][j] = null;
              cleaned = true;
            }
          }
        }
        removed.push(elementNum);
      }
    }
    return { cleaned, removed };
  };

  const resetGame = () => {
    let newGrid = createRandomGrid();
    // Clear any initial matches and ensure valid moves exist.
    // Cap attempts so the synchronous loop can never block the UI thread
    // indefinitely (smart deposition above makes this rarely needed).
    let attempts = 0;
    const MAX_RESET_ATTEMPTS = 200;
    while ((hasMatches(newGrid).length > 0 || !hasValidMoves(newGrid)) && attempts < MAX_RESET_ATTEMPTS) {
      newGrid = createRandomGrid();
      attempts++;
    }
    setGrid(newGrid);
    setScore(0);
    setMoves(40);
    setGameOver(false);
    setGameOverReason('');
    setSelected(null);
    setHintCells([]);
    setTargetCell(null);
    setNukeMode(false);
    setNukeTarget(null);
    setCatalystMode(false);
    setCatalystTarget(null);
    // Initialize element tracking from starting grid
    const initialElements = [...new Set(newGrid.flat().filter(Boolean))].sort((a, b) => a - b);
    setSeenElements(initialElements);
    setEliminatedElements(new Set());
  };

  const findMatches = (grid) => {
    const matches = [];
    
    // Check horizontal matches
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE - 2; j++) {
        const value = grid[i][j];
        if (value && grid[i][j + 1] === value && grid[i][j + 2] === value) {
          const match = [[i, j], [i, j + 1], [i, j + 2]];
          // Extend match if more tiles match
          let k = j + 3;
          while (k < GRID_SIZE && grid[i][k] === value) {
            match.push([i, k]);
            k++;
          }
          matches.push(match);
          j = k - 1; // Skip past this match
        }
      }
    }

    // Check vertical matches
    for (let j = 0; j < GRID_SIZE; j++) {
      for (let i = 0; i < GRID_SIZE - 2; i++) {
        const value = grid[i][j];
        if (value && grid[i + 1][j] === value && grid[i + 2][j] === value) {
          const match = [[i, j], [i + 1, j], [i + 2, j]];
          // Extend match if more tiles match
          let k = i + 3;
          while (k < GRID_SIZE && grid[k][j] === value) {
            match.push([k, j]);
            k++;
          }
          matches.push(match);
          i = k - 1; // Skip past this match
        }
      }
    }

    return matches;
  };

  const findElementByWeight = (targetWeight) => {
    // Find element with closest atomic weight
    let closest = ELEMENTS[0];
    let minDiff = Math.abs(ELEMENTS[0].weight - targetWeight);
    
    for (let i = 1; i < ELEMENTS.length; i++) {
      const diff = Math.abs(ELEMENTS[i].weight - targetWeight);
      if (diff < minDiff) {
        minDiff = diff;
        closest = ELEMENTS[i];
      } else if (diff === minDiff && ELEMENTS[i].number > closest.number) {
        // If same distance, use higher atomic number
        closest = ELEMENTS[i];
      }
    }
    
    return closest.number;
  };


  const createEmptyGrid = () => {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
  };

  const hasMatches = (grid) => {
    return findMatches(grid);
  };

  const hasValidMoves = (grid) => {
    // Check every possible swap to see if any would create a match
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        // Try swapping right
        if (j < GRID_SIZE - 1) {
          const testGrid = grid.map(r => [...r]);
          [testGrid[i][j], testGrid[i][j + 1]] = [testGrid[i][j + 1], testGrid[i][j]];
          if (findMatches(testGrid).length > 0) return true;
        }
        // Try swapping down
        if (i < GRID_SIZE - 1) {
          const testGrid = grid.map(r => [...r]);
          [testGrid[i][j], testGrid[i + 1][j]] = [testGrid[i + 1][j], testGrid[i][j]];
          if (findMatches(testGrid).length > 0) return true;
        }
      }
    }
    return false;
  };

  const findHintMove = () => {
    // Find first valid swap that creates a match
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        // Try swapping right
        if (j < GRID_SIZE - 1) {
          const testGrid = grid.map(r => [...r]);
          [testGrid[i][j], testGrid[i][j + 1]] = [testGrid[i][j + 1], testGrid[i][j]];
          if (findMatches(testGrid).length > 0) {
            return [[i, j], [i, j + 1]];
          }
        }
        // Try swapping down
        if (i < GRID_SIZE - 1) {
          const testGrid = grid.map(r => [...r]);
          [testGrid[i][j], testGrid[i + 1][j]] = [testGrid[i + 1][j], testGrid[i][j]];
          if (findMatches(testGrid).length > 0) {
            return [[i, j], [i + 1, j]];
          }
        }
      }
    }
    return null;
  };

  const showHint = () => {
    if (animating || gameOver) return;
    
    const hint = findHintMove();
    if (hint) {
      setHintCells(hint);
      setTimeout(() => setHintCells([]), 3000); // Show hint for 3 seconds
    }
  };


  const MAX_CASCADES = 20;

  const processMatches = async (grid, targetPos = null) => {
    let newGrid = grid.map(r => [...r]);
    let totalScore = 0;
    let bonusMoves = 0;
    let matchesFound = findMatches(newGrid);
    let comboCount = 0;
    const allRemovedElements = [];

    try {
    while (matchesFound.length > 0 && comboCount < MAX_CASCADES) {
      setAnimating(true);
      comboCount++;

      // Highlight matched cells
      const allMatchedCells = matchesFound.flat();
      setHighlightedCells(allMatchedCells);
      await new Promise(resolve => setTimeout(resolve, 400));

      // Merge matches into higher elements based on atomic weight
      matchesFound.forEach(match => {
        const elementNumber = newGrid[match[0][0]][match[0][1]];
        const element = ELEMENTS[elementNumber - 1];
        
        // Sum atomic weights of all matched tiles
        const totalWeight = element.weight * match.length;
        
        // Find element with closest atomic weight
        const newElementNumber = findElementByWeight(totalWeight);
        
        // Bonus moves for matches
        bonusMoves += 1; // Every match returns 1 move (net zero for basic 3-match)
        if (match.length >= 4) bonusMoves += 1; // 4 match = +2 total
        if (match.length >= 5) bonusMoves += 2; // 5 match = +4 total
        if (match.length >= 6) bonusMoves += 2; // 6+ match = +6 total
        
        // Clear matched tiles
        match.forEach(([row, col]) => {
          newGrid[row][col] = null;
        });

        // Place new element at target position if this is first combo and target exists
        // Otherwise use last position in match
        let resultPos;
        if (comboCount === 1 && targetPos && match.some(([r, c]) => r === targetPos.row && c === targetPos.col)) {
          resultPos = targetPos;
        } else {
          resultPos = { row: match[match.length - 1][0], col: match[match.length - 1][1] };
        }
        
        newGrid[resultPos.row][resultPos.col] = newElementNumber;
        totalScore += element.number * match.length * 10;
      });

      // Bonus move for combos (more generous)
      if (comboCount >= 2) {
        bonusMoves += 3; // Each cascade gives +3 moves
      }

      setHighlightedCells([]);
      setGrid(newGrid);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Drop tiles down
      for (let j = 0; j < GRID_SIZE; j++) {
        let writePos = GRID_SIZE - 1;
        for (let i = GRID_SIZE - 1; i >= 0; i--) {
          if (newGrid[i][j] !== null) {
            if (i !== writePos) {
              newGrid[writePos][j] = newGrid[i][j];
              newGrid[i][j] = null;
            }
            writePos--;
          }
        }
      }

      setGrid([...newGrid]);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Fill empty spaces with new elements
      for (let j = 0; j < GRID_SIZE; j++) {
        for (let i = 0; i < GRID_SIZE; i++) {
          if (newGrid[i][j] === null) {
            const depositionRange = getDepositionRange(newGrid);
            newGrid[i][j] = Math.floor(Math.random() * (depositionRange.max - depositionRange.min + 1)) + depositionRange.min;
          }
        }
      }

      // Remove obsolete low-tier elements (below deposition minimum, fewer than 3 on board)
      const { cleaned: didClean, removed: removedNow } = cleanupObsoleteElements(newGrid);
      allRemovedElements.push(...removedNow);
      if (didClean) {
        for (let j = 0; j < GRID_SIZE; j++) {
          let writePos = GRID_SIZE - 1;
          for (let i = GRID_SIZE - 1; i >= 0; i--) {
            if (newGrid[i][j] !== null) {
              if (i !== writePos) {
                newGrid[writePos][j] = newGrid[i][j];
                newGrid[i][j] = null;
              }
              writePos--;
            }
          }
        }
        for (let j = 0; j < GRID_SIZE; j++) {
          for (let i = 0; i < GRID_SIZE; i++) {
            if (newGrid[i][j] === null) {
              const depositionRange = getDepositionRange(newGrid);
              newGrid[i][j] = Math.floor(Math.random() * (depositionRange.max - depositionRange.min + 1)) + depositionRange.min;
            }
          }
        }
      }

      setGrid([...newGrid]);
      await new Promise(resolve => setTimeout(resolve, 300));

      matchesFound = findMatches(newGrid);
    }
    } finally {
      setAnimating(false);
    }

    return { grid: newGrid, score: totalScore, bonusMoves, removedElements: allRemovedElements };
  };

  const handleTileClick = async (row, col) => {
    if (animating || gameOver) return;

    if (nukeMode) {
      await executeNuke(row, col);
      return;
    }

    if (catalystMode) {
      await executeCatalyst(row, col);
      return;
    }

    // Clear any active hints
    setHintCells([]);

    if (!selected) {
      setSelected({ row, col });
      return;
    }

    const { row: selRow, col: selCol } = selected;

    // Check if adjacent
    const isAdjacent = 
      (Math.abs(row - selRow) === 1 && col === selCol) ||
      (Math.abs(col - selCol) === 1 && row === selRow);

    if (!isAdjacent) {
      setSelected({ row, col });
      return;
    }

    // Swap tiles
    const newGrid = grid.map(r => [...r]);
    [newGrid[row][col], newGrid[selRow][selCol]] = [newGrid[selRow][selCol], newGrid[row][col]];

    // Check if this creates matches
    const matches = findMatches(newGrid);

    if (matches.length > 0) {
      setGrid(newGrid);
      setSelected(null);
      setMoves(moves - 1);

      // Target cell is the one that was clicked second (current row, col)
      const targetPosition = { row, col };
      const { grid: finalGrid, score: gainedScore, bonusMoves, removedElements } = await processMatches(newGrid, targetPosition);

      const newScore = score + gainedScore;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('elementSwapHighScore', newScore.toString());
      }

      // Add bonus moves
      const newMoves = moves - 1 + bonusMoves;
      setMoves(newMoves);

      // Update discovered elements and retired elements
      setSeenElements(prev => {
        const prevSet = new Set(prev);
        const newEls = [...new Set(finalGrid.flat().filter(el => el && !prevSet.has(el)))].sort((a, b) => a - b);
        return newEls.length > 0 ? [...prev, ...newEls].sort((a, b) => a - b) : prev;
      });
      if (removedElements.length > 0) {
        setEliminatedElements(prev => new Set([...prev, ...removedElements]));
      }

      // Check if game should end
      if (newMoves <= 0) {
        setGameOver(true);
        setGameOverReason('No moves remaining');
      }
    } else {
      // Non-merging move: apply swap, still costs a move
      setGrid(newGrid);
      setSelected(null);
      const newMoves = moves - 1;
      setMoves(newMoves);
      if (newMoves <= 0) {
        setGameOver(true);
        setGameOverReason('No moves remaining');
      }
    }
  };

  const getTileStyle = (value) => {
    if (!value) return {};
    const element = ELEMENTS[value - 1];
    return {
      backgroundColor: element.color,
    };
  };

  const toggleNukeMode = () => {
    if (moves < 5 || animating || gameOver) return;
    setNukeMode(!nukeMode);
    setNukeTarget(null);
    setSelected(null);
  };

  const getNukeArea = (centerRow, centerCol) => {
    // Get 3x3 area centered on the clicked tile
    const affectedCells = [];
    for (let i = centerRow - 1; i <= centerRow + 1; i++) {
      for (let j = centerCol - 1; j <= centerCol + 1; j++) {
        if (i >= 0 && i < GRID_SIZE && j >= 0 && j < GRID_SIZE) {
          affectedCells.push([i, j]);
        }
      }
    }
    return affectedCells;
  };

  const getCatalystArea = (centerRow, centerCol) => {
    // Get the 4 orthogonally adjacent tiles (N, S, E, W)
    return [
      [centerRow - 1, centerCol],
      [centerRow + 1, centerCol],
      [centerRow, centerCol - 1],
      [centerRow, centerCol + 1],
    ].filter(([i, j]) => i >= 0 && i < GRID_SIZE && j >= 0 && j < GRID_SIZE);
  };

  const executeNuke = async (centerRow, centerCol) => {
    if (moves < 5 || animating) return;

    setAnimating(true);
    try {
    const affectedCells = getNukeArea(centerRow, centerCol);

    // Calculate score penalty (sum of atomic weights)
    let scorePenalty = 0;
    affectedCells.forEach(([i, j]) => {
      if (grid[i][j]) {
        scorePenalty += ELEMENTS[grid[i][j] - 1].weight;
      }
    });

    // Highlight affected area briefly
    setHighlightedCells(affectedCells);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Clear the 3x3 area
    const newGrid = grid.map(r => [...r]);
    affectedCells.forEach(([i, j]) => {
      newGrid[i][j] = null;
    });
    
    setHighlightedCells([]);
    setGrid(newGrid);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Drop tiles down
    for (let j = 0; j < GRID_SIZE; j++) {
      let writePos = GRID_SIZE - 1;
      for (let i = GRID_SIZE - 1; i >= 0; i--) {
        if (newGrid[i][j] !== null) {
          if (i !== writePos) {
            newGrid[writePos][j] = newGrid[i][j];
            newGrid[i][j] = null;
          }
          writePos--;
        }
      }
    }

    setGrid([...newGrid]);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Fill empty spaces
    for (let j = 0; j < GRID_SIZE; j++) {
      for (let i = 0; i < GRID_SIZE; i++) {
        if (newGrid[i][j] === null) {
          const depositionRange = getDepositionRange(newGrid);
          newGrid[i][j] = Math.floor(Math.random() * (depositionRange.max - depositionRange.min + 1)) + depositionRange.min;
        }
      }
    }

    // Remove obsolete low-tier elements (below deposition minimum, fewer than 3 on board)
    const { cleaned: nukeClean, removed: nukeRemoved } = cleanupObsoleteElements(newGrid);
    if (nukeRemoved.length > 0) {
      setEliminatedElements(prev => new Set([...prev, ...nukeRemoved]));
    }
    if (nukeClean) {
      for (let j = 0; j < GRID_SIZE; j++) {
        let writePos = GRID_SIZE - 1;
        for (let i = GRID_SIZE - 1; i >= 0; i--) {
          if (newGrid[i][j] !== null) {
            if (i !== writePos) {
              newGrid[writePos][j] = newGrid[i][j];
              newGrid[i][j] = null;
            }
            writePos--;
          }
        }
      }
      for (let j = 0; j < GRID_SIZE; j++) {
        for (let i = 0; i < GRID_SIZE; i++) {
          if (newGrid[i][j] === null) {
            const depositionRange = getDepositionRange(newGrid);
            newGrid[i][j] = Math.floor(Math.random() * (depositionRange.max - depositionRange.min + 1)) + depositionRange.min;
          }
        }
      }
    }

    setGrid([...newGrid]);

    // Update discovered elements after nuke
    setSeenElements(prev => {
      const prevSet = new Set(prev);
      const newEls = [...new Set(newGrid.flat().filter(el => el && !prevSet.has(el)))].sort((a, b) => a - b);
      return newEls.length > 0 ? [...prev, ...newEls].sort((a, b) => a - b) : prev;
    });

    // Deduct score and moves
    const newScore = Math.max(0, score - scorePenalty);
    setScore(newScore);
    setMoves(moves - 5);

    setNukeMode(false);
    setNukeTarget(null);

    const finalMoves = moves - 5;
    if (finalMoves <= 0) {
      setGameOver(true);
      setGameOverReason('No moves remaining');
    }
    } finally {
      setAnimating(false);
    }
  };

  const CATALYST_COST = 3;

  const toggleCatalystMode = () => {
    if (moves < CATALYST_COST || animating || gameOver) return;
    setCatalystMode(!catalystMode);
    setCatalystTarget(null);
    setNukeMode(false);
    setNukeTarget(null);
    setSelected(null);
  };

  const executeCatalyst = async (centerRow, centerCol) => {
    if (moves < CATALYST_COST || animating) return;

    const targetElement = grid[centerRow][centerCol];
    if (!targetElement) return;

    setAnimating(true);
    try {
      const area = getCatalystArea(centerRow, centerCol);

      // Highlight the affected area
      setHighlightedCells(area);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Convert all tiles in area to the target element
      const newGrid = grid.map(r => [...r]);
      area.forEach(([i, j]) => {
        newGrid[i][j] = targetElement;
      });

      setHighlightedCells([]);
      setGrid([...newGrid]);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Process any matches created
      const { grid: finalGrid, score: gainedScore, bonusMoves, removedElements } = await processMatches(newGrid);

      const newScore = score + gainedScore;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
      }

      setGrid(finalGrid);

      setSeenElements(prev => {
        const prevSet = new Set(prev);
        const newEls = [...new Set(finalGrid.flat().filter(el => el && !prevSet.has(el)))].sort((a, b) => a - b);
        return newEls.length > 0 ? [...prev, ...newEls].sort((a, b) => a - b) : prev;
      });
      if (removedElements.length > 0) {
        setEliminatedElements(prev => new Set([...prev, ...removedElements]));
      }

      const finalMoves = moves - CATALYST_COST + bonusMoves;
      setMoves(finalMoves);

      setCatalystMode(false);
      setCatalystTarget(null);

      if (finalMoves <= 0) {
        setGameOver(true);
        setGameOverReason('No moves remaining');
      }
    } finally {
      setAnimating(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Atom className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-800">Fusion Tiles</h1>
          </div>
          <p className="text-gray-600">Match 3+ elements to merge them!</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex justify-around items-center mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{score}</div>
              <div className="text-xs text-gray-500">Score</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                moves <= 3 ? 'text-red-600 animate-pulse' :
                moves <= 5 ? 'text-red-500' :
                moves <= 10 ? 'text-orange-500' :
                'text-blue-600'
              }`}>{moves}</div>
              <div className="text-xs text-gray-500">Moves Left</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <div className="text-2xl font-bold text-amber-600">{highScore}</div>
              </div>
              <div className="text-xs text-gray-500">Best</div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={showHint}
              disabled={gameOver || animating}
              className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lightbulb className="w-4 h-4" />
              Hint
            </button>
            <button
              onClick={resetGame}
              className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New
            </button>
          </div>

          {/* Low moves warning */}
          {!gameOver && moves > 0 && moves <= 5 && (
            <div className={`mb-3 p-2 text-center rounded-lg font-semibold flex items-center justify-center gap-2 ${
              moves <= 3
                ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                : 'bg-amber-100 text-amber-700 border border-amber-300'
            }`}>
              <AlertTriangle className="w-4 h-4" />
              {moves <= 3 ? `Only ${moves} move${moves === 1 ? '' : 's'} left!` : `${moves} moves remaining`}
            </div>
          )}

          <div className="relative">
            {/* Nuke mode banner */}
            {nukeMode && (
              <div className="mb-3 p-3 bg-orange-500 text-white text-center rounded-lg font-semibold flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Click a tile to destroy 3×3 area
                {nukeTarget && (() => {
                  const area = getNukeArea(nukeTarget.row, nukeTarget.col);
                  const penalty = area.reduce((sum, [i, j]) => {
                    return sum + (grid[i][j] ? ELEMENTS[grid[i][j] - 1].weight : 0);
                  }, 0);
                  return <span className="ml-2">(-{penalty} pts, -5 moves)</span>;
                })()}
              </div>
            )}

            {catalystMode && (
              <div className="mb-3 p-3 bg-green-600 text-white text-center rounded-lg font-semibold flex items-center justify-center gap-2">
                <FlaskConical className="w-5 h-5" />
                Click a tile to convert its 4 neighbors to that element
                {catalystTarget && grid[catalystTarget.row]?.[catalystTarget.col] && (() => {
                  const el = ELEMENTS[grid[catalystTarget.row][catalystTarget.col] - 1];
                  return <span className="ml-2">(→ all {el.symbol}, -{CATALYST_COST} moves)</span>;
                })()}
              </div>
            )}

            <div className="grid grid-cols-6 gap-1 mb-4 bg-gray-200 p-2 rounded-lg">
            {grid.length > 0 && grid.map((row, i) =>
              row.map((cell, j) => {
                const isHighlighted = highlightedCells.some(([r, c]) => r === i && c === j);
                const isHint = hintCells.some(([r, c]) => r === i && c === j);
                
                // Check if this tile is in nuke preview area
                const isInNukeArea = nukeMode && nukeTarget &&
                  getNukeArea(nukeTarget.row, nukeTarget.col).some(([r, c]) => r === i && c === j);

                // Check if this tile is in catalyst preview area
                const isInCatalystArea = catalystMode && catalystTarget &&
                  getCatalystArea(catalystTarget.row, catalystTarget.col).some(([r, c]) => r === i && c === j);
                const isCatalystCenter = catalystMode && catalystTarget &&
                  catalystTarget.row === i && catalystTarget.col === j;

                return (
                  <div
                    key={`${i}-${j}`}
                    onClick={() => handleTileClick(i, j)}
                    onMouseEnter={() => {
                      if (nukeMode) setNukeTarget({ row: i, col: j });
                      if (catalystMode) setCatalystTarget({ row: i, col: j });
                    }}
                    onMouseLeave={() => {
                      if (nukeMode) setNukeTarget(null);
                      if (catalystMode) setCatalystTarget(null);
                    }}
                    className={`aspect-square rounded cursor-pointer transition-all ${
                      nukeMode
                        ? isInNukeArea
                          ? 'ring-4 ring-red-500 scale-105 bg-red-200'
                          : 'opacity-50'
                        : catalystMode
                        ? isCatalystCenter
                          ? 'ring-4 ring-green-500 scale-110'
                          : isInCatalystArea
                          ? 'ring-2 ring-green-400 scale-105'
                          : 'opacity-60'
                        : selected?.row === i && selected?.col === j
                        ? 'ring-4 ring-purple-500 scale-105'
                        : isHighlighted
                        ? 'ring-4 ring-green-400 scale-110'
                        : isHint
                        ? 'ring-4 ring-yellow-400 scale-110 animate-pulse'
                        : 'hover:scale-105'
                    }`}
                    style={getTileStyle(cell)}
                  >
                    {cell && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="text-xl font-bold text-gray-700">
                          {ELEMENTS[cell - 1].symbol}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {ELEMENTS[cell - 1].weight}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-center gap-2 mt-3">
            <button
              onClick={toggleNukeMode}
              disabled={gameOver || animating || moves < 5}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                nukeMode
                  ? 'bg-red-600 text-white ring-2 ring-red-400'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              <Zap className="w-4 h-4" />
              Nuke
            </button>
            <button
              onClick={toggleCatalystMode}
              disabled={gameOver || animating || moves < CATALYST_COST}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                catalystMode
                  ? 'bg-green-700 text-white ring-2 ring-green-400'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              Catalyst
            </button>
          </div>
          </div>

          {grid.length > 0 && (() => {
            const elementCounts = {};
            grid.flat().filter(Boolean).forEach(el => {
              elementCounts[el] = (elementCounts[el] || 0) + 1;
            });
            const { min: depositionMin, max: depositionMax } = getDepositionRange(grid);

            return (
              <div className="mb-3 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-gray-700">
                    Elements Discovered
                    <span className="ml-2 text-xs font-normal text-gray-400">({seenElements.length} total)</span>
                  </div>
                  <div className="text-xs text-blue-600">
                    Depositing: <span className="font-semibold">{ELEMENTS[depositionMin - 1]?.symbol}</span>–<span className="font-semibold">{ELEMENTS[depositionMax - 1]?.symbol}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  New elements appear as you fuse. Grayed-out elements are not currently on the board or have been retired.
                </p>
                <div className="flex flex-wrap gap-1">
                  {seenElements.map(elNum => {
                    const el = ELEMENTS[elNum - 1];
                    const count = elementCounts[elNum] || 0;
                    const isEliminated = eliminatedElements.has(elNum);
                    const shouldGrey = isEliminated || count === 0;

                    return (
                      <div
                        key={elNum}
                        className={`relative px-2 py-1 rounded text-xs font-medium border transition-all ${
                          shouldGrey ? 'opacity-40' : ''
                        }`}
                        style={{
                          backgroundColor: shouldGrey ? '#d1d5db' : el.color,
                          borderColor: shouldGrey ? '#9ca3af' : '#999',
                        }}
                        title={`${el.name} (${el.symbol}) · weight ${el.weight}${isEliminated ? ' · Retired' : count > 0 ? ` · ×${count} on board` : ' · Not on board'}`}
                      >
                        <div className={`font-bold leading-none ${shouldGrey ? 'text-gray-400' : 'text-gray-700'}`}>
                          {el.symbol}
                        </div>
                        {isEliminated ? (
                          <div className="text-[8px] text-gray-400 leading-none mt-0.5">retired</div>
                        ) : count > 0 ? (
                          <div className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">
                            {count}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="text-sm text-gray-600 text-center">
            Swap adjacent tiles to match 3+ identical elements.<br />
            <span className="font-semibold text-purple-700">Matched elements fuse based on total atomic mass!</span><br />
            <span className="text-xs">Example: 3 H (mass 1 each) = 3 total → He (mass 4)</span><br />
            <span className="text-xs text-green-600">Bonus moves: 3 match (+1), 4 match (+2), 5 match (+4), 6+ match (+6), combos (+2 each)</span><br />
            <span className="text-xs text-orange-600 font-semibold">Nuke: Destroy 3×3 area for -5 moves and -(sum of weights) score</span><br />
            <span className="text-xs text-green-700 font-semibold">Catalyst: Convert 4 adjacent tiles to one element for -{CATALYST_COST} moves</span><br />
            <span className="text-xs text-indigo-600">Non-matching swaps are allowed but cost a move</span><br />
            <span className="text-xs text-gray-500 mt-1 block">
              As you fuse heavier elements, the deposition pool shifts upward. Lighter elements with fewer than 3 tiles remaining are automatically retired from the board.
            </span>
          </div>
        </div>

        {gameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 text-center">
              <div className="text-4xl font-bold text-purple-800 mb-4">Game Over!</div>
              <div className="text-lg text-purple-600 mb-2">
                {gameOverReason}
              </div>
              <div className="text-2xl font-bold text-purple-700 mb-6">
                Final Score: {score}
              </div>
              {score === highScore && score > 0 && (
                <div className="text-amber-600 font-semibold mb-4 flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5" />
                  New High Score!
                </div>
              )}
              <button
                onClick={resetGame}
                className="px-8 py-3 bg-purple-600 text-white text-lg rounded-lg hover:bg-purple-700 transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
