import fs from "fs/promises";
import path from "path";
import asciichart from "asciichart"; // You'll need to npm install asciichart

async function analyzeProfiles() {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    console.log(`Found ${jsonFiles.length} profile files to analyze`);

    let characteristicStats = {};
    let totalProcessed = 0;
    let errorCount = 0;

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(dataDir, file);
        const data = JSON.parse(await fs.readFile(filePath, "utf8"));

        if (data.characteristics) {
          data.characteristics.forEach((char) => {
            if (!characteristicStats[char.name]) {
              characteristicStats[char.name] = {
                total: 0,
                options: {},
              };
            }

            characteristicStats[char.name].total++;

            if (char.options) {
              char.options.forEach((opt) => {
                const value = opt.value || opt.description;
                if (!characteristicStats[char.name].options[value]) {
                  characteristicStats[char.name].options[value] = 0;
                }
                characteristicStats[char.name].options[value]++;
              });
            }
          });
          totalProcessed++;
        }
      } catch (err) {
        console.error(`Error processing file ${file}:`, err.message);
        errorCount++;
      }
    }

    // Format the analysis results with ASCII charts
    let output = "\n=== Profile Analysis Results ===\n";
    output += `Total profiles processed: ${totalProcessed}\n`;
    output += `Files with errors: ${errorCount}\n`;
    output += "\nCharacteristic Distribution:\n";

    Object.entries(characteristicStats).forEach(([char, stats]) => {
      output += `\n${char}:\n`;
      output += `Total occurrences: ${stats.total}\n`;

      // Create bar chart data
      const options = Object.entries(stats.options);
      const values = options.map(([_, count]) => count);
      const maxValue = Math.max(...values);
      const chartWidth = 50;

      output += "\nDistribution Chart:\n";
      options.forEach(([option, count]) => {
        const barLength = Math.round((count / maxValue) * chartWidth);
        const bar = "█".repeat(barLength);
        const percentage = ((count / stats.total) * 100).toFixed(2);
        output += `${option.padEnd(20)} ${bar} ${count} (${percentage}%)\n`;
      });

      // Add a trend line if there are multiple data points
      if (values.length > 1) {
        output += "\nTrend Line:\n";
        const config = {
          height: 10,
          colors: [asciichart.blue],
        };
        output += asciichart.plot(values, config) + "\n";
      }

      output += "\n" + "─".repeat(60) + "\n";
    });

    // Write results to a file
    const outputPath = path.join(process.cwd(), "analysis_results.txt");
    await fs.writeFile(outputPath, output, "utf8");
    console.log("Analysis results have been written to:", outputPath);

    // Also log to console
    console.log(output);
  } catch (error) {
    console.error("Error analyzing profiles:", error);
    console.error("Error details:", error.message);
  }
}

// Execute the function
console.log("Starting profile analysis...");
analyzeProfiles();
