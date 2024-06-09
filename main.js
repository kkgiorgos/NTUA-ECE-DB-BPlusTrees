import './style.css'
import { Node, BPlusTree } from './tree.js'
import _ from 'https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js';

let b_plus_tree;

// --------------------------------------------------

// Drawing Functionality
const canvas = document.getElementById('treeCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  let topBar = document.querySelector('#operations');
  let messageBox = document.getElementById('message');
  let topBarHeight = topBar.getBoundingClientRect().height;
  let messageBoxHeight = messageBox.getBoundingClientRect().height;
  let windowHeight = window.innerHeight;
  let remainingHeight = windowHeight - topBarHeight - messageBoxHeight;

  canvas.width = window.innerWidth;
  canvas.height = 0.8 * remainingHeight;
}

// Call resizeCanvas when the window is resized
window.addEventListener('resize', function() {
  displayItem(treeHistory[treeHistory.length-1]);
});

function roundedRect(ctx, centerX, y, width, height, radius) {
  const x = centerX - width / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  // you can fill or stroke the rectangle as you wish, for example:
  ctx.stroke();
}

function drawArrow(ctx, fromx, fromy, tox, toy){
  var headlen = 10; // length of head in pixels
  var dx = tox-fromx;
  var dy = toy-fromy;
  var angle = Math.atan2(dy,dx);
  ctx.moveTo(fromx, fromy);
  ctx.lineTo(tox, toy);
  ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
  ctx.moveTo(tox, toy);
  ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
  ctx.stroke();
}

function drawNode(ctx, node, x, y, width, height, printing) {  
  // Set the font size based on the node height
  let fontSize = Math.min(height, width) * 0.3; // Adjust the multiplier as needed
  ctx.font = fontSize + 'px sans-serif';
  
  // Center the text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Check if the user has selected the dark mode
  let darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Choose the font and line stroke color based on the user's mode
  ctx.fillStyle = (darkMode && !printing) ? 'white' : 'black';
  ctx.strokeStyle = (darkMode && !printing) ? 'white' : 'black';

  roundedRect(ctx, x, y, width, height, 20);

  // Calculate the width of each part
  let partWidth = width / node.values.length;
  x = x - width/2;
  // Draw each value in its part
  for (let i = 0; i < node.values.length; i++) {
    let partX = x + i * partWidth;
    ctx.fillText(node.values[i], partX + partWidth / 2, y + height / 2);

    // Draw a vertical line to separate the parts, except for the first part
    if (i > 0) {
      ctx.moveTo(partX, y);
      ctx.lineTo(partX, y + height);
      ctx.stroke();
    }
  }
}

function drawTree(ctx, tree, x, y, width, height, printing = false) {
  let treeHeight = tree.get_height();
  let nodeHeight = height / treeHeight;
  let leafCount = tree.get_leaf_count();
  let nodeWidth = width / leafCount;

  function drawNodeRecursively(ctx, node, x, y, width, height) {
    if (!node.is_leaf()) {
      const childCount = node.pointers.length;
      const availableWidth = width / childCount;
      const arrowAvailableWidth = nodeWidth / childCount;
      drawNode(ctx, node, x, y, 0.8 * nodeWidth, 0.5 * nodeHeight, printing);
      for (let i = 0; i < node.pointers.length; i++) {
        const new_x = x - (width/2) + (i * availableWidth) + (availableWidth / 2);
        const arrow_x = x - (nodeWidth/2) + (i * arrowAvailableWidth) + (arrowAvailableWidth / 2);
        drawArrow(ctx, arrow_x, y + 0.5*nodeHeight, new_x, y + nodeHeight);
        drawNodeRecursively(ctx, node.pointers[i], new_x, y + nodeHeight, availableWidth, height);
      }
    } else {
      drawNode(ctx, node, x, y, 0.8 * width, 0.5 * nodeHeight, printing);
    }
  }

  drawNodeRecursively(ctx, tree.root, x, y, width, height);
}

function redrawTree(tree) {
  // Clear the canvas
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the tree
  drawTree(ctx, tree, canvas.width/2, 0, canvas.width, canvas.height);
}

// --------------------------------------------------

// Request Handling
document.getElementById('createBTreeForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const degree = event.target.elements.degree.value;
  if (degree < 3) {
    alert("Degree must be at least 3");
    return;
  }
  b_plus_tree = new BPlusTree(parseInt(degree));
  updateTreeHistory(b_plus_tree, "Creating Empty Tree with Degree " + degree);
});

document.getElementById('findValueForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const value = event.target.elements.findValue.value;
  const result = b_plus_tree.find(parseInt(value));
  let message = "Searching for " + value;
  if (result) {
    message += "\nFound!";
  } else {
    message += "\nNot Found :(";
  }
  updateTreeHistory(b_plus_tree, message);
});

document.getElementById('insertValueForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const value = event.target.elements.insertValue.value;
  b_plus_tree.insert(parseInt(value));
  updateTreeHistory(b_plus_tree, "Inserting " + value);
});

document.getElementById('deleteValueForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const value = event.target.elements.deleteValue.value;
  b_plus_tree.remove(parseInt(value));
  updateTreeHistory(b_plus_tree, "Deleting " + value);
});

document.getElementById('printTreeButton').addEventListener('click', function() {
  printTrees();
});


// --------------------------------------------------

// History Slider

// Global array to store the history of tree states
let treeHistory = [];

// Function to serialize the tree
function serializeTree(tree) {
  return _.cloneDeep(tree);
}

// Call this function each time the tree changes
function updateTreeHistory(tree, operation) {
  treeHistory.push({
    treeState: serializeTree(tree),
    operation: operation
  });
  document.getElementById('historySlider').max = treeHistory.length - 1;
  document.getElementById('historySlider').value = treeHistory.length - 1;
  displayItem(treeHistory[treeHistory.length-1]);
}

function displayItem(item) {
  // Display the tree state
  redrawTree(item.treeState);
  // Display the operation
  document.getElementById('message').textContent = item.operation;
}

// Event listener for the history slider
document.getElementById('historySlider').addEventListener('input', function() {
  let historyItem = treeHistory[this.value];
  displayItem(historyItem);
});

document.getElementById('previousTreeButton').addEventListener('click', function() {
  let slider = document.getElementById('historySlider');
  if (slider.value > slider.min) {
    slider.value--;
    // Display the tree state
    displayItem(treeHistory[slider.value]);
  }
});

document.getElementById('nextTreeButton').addEventListener('click', function() {
  let slider = document.getElementById('historySlider');
  if (slider.value < slider.max) {
    slider.value++;
    // Display the tree state
    displayItem(treeHistory[slider.value]);
  }
});

document.getElementById('resetButton').addEventListener('click', function() {
  // Reset the history
  treeHistory = [];
  document.getElementById('historySlider').max = 0;
  document.getElementById('historySlider').value = 0;

  // Clear the stored tree state
  localStorage.removeItem('treeHistory');

  // Redraw the tree
  updateTreeHistory(b_plus_tree, "Starting Tree");
  redrawTree(b_plus_tree);
});

// --------------------------------------------------

// Printing Functionality
function printTrees() {
  // Create a new window or tab
  let printWindow = window.open('', '_blank');
  
  // Add styles and title to the new window or tab
  printWindow.document.write('<html><head><title>Print Trees</title>');
  printWindow.document.write('<link rel="stylesheet" href="./style.css">');
  printWindow.document.write('</head><body>');
  
  // Add each tree to the new window or tab
  for (let i = 0; i < treeHistory.length; i++) {
    printWindow.document.write('<div>');
    printWindow.document.write('<h1>' + treeHistory[i].operation + '</p>');
    printWindow.document.write('<div id="tree' + i + '">');
    printWindow.document.write('<canvas id="treeCanvas' + i + '"></canvas>');
    const canvas = printWindow.document.getElementById('treeCanvas' + i);
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 450;
    drawTree(ctx, treeHistory[i].treeState, canvas.width/2, 0, canvas.width, canvas.height, true);
    printWindow.document.write('</div></div>');
  }
  
  // Close the body and html tags
  printWindow.document.write('</body></html>');
  
  // Call the print function
  printWindow.print();
}