const fs = require('fs');
const path = require('path');
const issues = [];
const ok = [];

// ─────────────────────────────────────────────
// 1. SYNTAX CHECK: All JS files in root + js/
// ─────────────────────────────────────────────
const rootJsFiles = ['dashboard.js','trip-details.js','utils.js','auth.js','car-calculations.js','firebase-config.js','sw.js'];
const subJsFiles = fs.readdirSync('js').map(f => 'js/' + f).filter(f => f.endsWith('.js'));
const allJs = [...rootJsFiles, ...subJsFiles];
const { execSync } = require('child_process');
allJs.forEach(f => {
    try {
        execSync('node -c "' + f + '"', { stdio: 'pipe' });
        ok.push('JS syntax OK: ' + f);
    } catch(e) {
        issues.push('[SYNTAX ERROR] ' + f + ': ' + e.stderr.toString().trim());
    }
});

// ─────────────────────────────────────────────
// 2. FILE EXISTENCE CHECKS
// ─────────────────────────────────────────────
const requiredFiles = ['dashboard.html','trip-details.html','dashboard.js','trip-details.js','utils.js','auth.js','styles.css','icon.png','manifest.json','firebase-config.js','sw.js','indian-train.png','login.html','signup.html'];
requiredFiles.forEach(f => {
    if (!fs.existsSync(f)) {
        issues.push('[MISSING FILE] ' + f + ' not found');
    } else {
        ok.push('File exists: ' + f);
    }
});

// ─────────────────────────────────────────────
// 3. SW.JS: Check all ASSETS_TO_CACHE files exist
// ─────────────────────────────────────────────
const sw = fs.readFileSync('sw.js', 'utf-8');
const cacheMatches = sw.match(/'\.\/[^']+'/g) || [];
cacheMatches.forEach(m => {
    const relPath = m.replace(/'/g,'').replace('./','');
    if (!fs.existsSync(relPath)) {
        issues.push('[SW CACHE] sw.js caches missing file: ' + relPath);
    }
});
if (!sw.includes('indian-train.png')) {
    issues.push('[SW CACHE] sw.js ASSETS_TO_CACHE missing indian-train.png - offline mode will break');
}

// ─────────────────────────────────────────────
// 4. MANIFEST.JSON: Check icon files exist
// ─────────────────────────────────────────────
try {
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
    (manifest.icons || []).forEach(ic => {
        if (!fs.existsSync(ic.src.replace('./','').replace('/','/'))) {
            issues.push('[MANIFEST] Icon missing: ' + ic.src);
        }
    });
} catch(e) {
    issues.push('[MANIFEST] manifest.json parse error: ' + e.message);
}

// ─────────────────────────────────────────────
// 5. DASHBOARD.JS: Key functions defined
// ─────────────────────────────────────────────
const dash = fs.readFileSync('dashboard.js','utf-8');
const requiredFns = ['resolveIndianRailwayStationCode','getAILiveTrainStatusData','refreshAILiveTrainStatus','_calcJourneyProgress','_getDepartureMs','fetchAndShowLiveTrainStatus','openHeroTicketModal','togglePassengerOnTrainGps','startPassengerOnTrainGpsTracking','stopPassengerOnTrainGpsTracking','_renderCleanLiveTrainStatus','sendToGroq','sendToAiAssistant'];
requiredFns.forEach(fn => {
    if (!dash.includes('function ' + fn) && !dash.includes(fn + ' = function') && !dash.includes(fn + '=function') && !dash.includes('window.' + fn)) {
        issues.push('[MISSING FN] dashboard.js: function "' + fn + '" is not defined');
    } else {
        ok.push('dashboard.js fn defined: ' + fn);
    }
});

// ─────────────────────────────────────────────
// 6. GROQ KEY LOADING
// ─────────────────────────────────────────────
if (dash.includes('window._groqApiKey') && dash.includes('_groqApiKey =')) {
    ok.push('Groq API Key loaded correctly');
} else {
    issues.push('[GROQ] window._groqApiKey may never be populated - check loadOpenRouterKey/loadOpenRouterKeyShared');
}

// ─────────────────────────────────────────────
// 7. UTILS.JS: Key functions exist
// ─────────────────────────────────────────────
const utils = fs.readFileSync('utils.js','utf-8');
const utilsFns = ['geocodeLocation','calculateHaversineDistance','loadOpenRouterKeyShared','getAILegDistancesGroq'];
utilsFns.forEach(fn => {
    if (!utils.includes('function ' + fn) && !utils.includes(fn + ' = function')) {
        issues.push('[MISSING FN] utils.js: "' + fn + '" not defined');
    } else {
        ok.push('utils.js fn defined: ' + fn);
    }
});

// ─────────────────────────────────────────────
// OUTPUT
// ─────────────────────────────────────────────
console.log('\n=== TRAVELMATE PROJECT ANALYSIS RESULTS ===\n');
console.log('Checks PASSED: ' + ok.length);
console.log('Issues FOUND:  ' + issues.length + '\n');
if (issues.length === 0) {
    console.log('ALL CLEAR - No issues found!');
} else {
    issues.forEach(i => console.log('  [!] ' + i));
}
