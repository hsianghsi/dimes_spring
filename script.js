// Load data from the provided JSON file
d3.json("https://raw.githubusercontent.com/hsianghsi/dimes/master/dimesA.json").then(function(data) {

    // Create an object to store nodes by name for easy lookup
    const nodeLookup = {};

    // Create nodes for DBA and OwnerName without duplicates
    const nodes = data.flatMap(item => {
        const dbaNode = { name: item.DBA, class: item.Class };
        const ownerNodes = item.OwnerList.map(owner => ({ name: owner, class: 'Owner' }));
        return [dbaNode, ...ownerNodes];
    }).filter((node, index, self) => {
        // Filter out duplicates based on name
        return index === self.findIndex(n => n.name === node.name);
    });

    // Store nodes in the lookup object
    nodes.forEach(node => {
        if (!nodeLookup[node.name]) {
            nodeLookup[node.name] = node;
        }
    });

    // Create links based on shared "DBA" names without duplicates
    const links = data.flatMap(item => {
        const dbaNode = nodeLookup[item.DBA];
        const ownerNodes = item.OwnerList.map(owner => nodeLookup[owner]).filter(Boolean); // Filter out undefined nodes
        return ownerNodes.map(ownerNode => ({ source: dbaNode, target: ownerNode }));
    });

    // Separate links by class
    const linksByClass = {};
    links.forEach(link => {
        const sourceClass = link.source.class;
        if (!linksByClass[sourceClass]) {
            linksByClass[sourceClass] = [];
        }
        linksByClass[sourceClass].push(link);
    });

    // Create the SVG container
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(d3.zoom().scaleExtent([0.5, 2]).on("zoom", zoomed))
        .append("g");

    // Create the simulation with adjusted parameters
    const simulation = d3.forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-60)) // Global charge force
        .force("center", d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2))
        .alphaDecay(0.03) // Adjust alpha decay rate
        .force("collide", d3.forceCollide(8).iterations(4)); // Add forceCollide

    // Add separate link forces for each class
    Object.keys(linksByClass).forEach(className => {
        const forceLink = d3.forceLink(linksByClass[className])
            .id(d => d.name)
            .distance(70)
            .strength(d => (d.source.class === className ? 1.6 : 0.8)); // Adjust strength based on class

        simulation.force(`link-${className}`, forceLink);
    });

    // Create links
    const link = svg.selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 1);

    // Create nodes
    const node = svg.selectAll("g")
        .data(nodes)
        .enter().append("g");

    // Append circles for "DBA"
    node.filter(d => d.class !== 'Owner')
        .append("circle")
        .attr("r", 4)
        .attr("fill", d => (d.class === 'A' ? "blue" : "black"));

    // Append squares for "OwnerName"
    node.filter(d => d.class === 'Owner')
        .append("circle")
        .attr("r", 4)
        .attr("fill", "orange");

    // Add labels to nodes
    const label = node.append("text")
        .text(d => d.name)
        .attr("font-size", 7)
        .attr("dx", d => (d.class === 'Owner' ? 6 : 12))
        .attr("dy", 4);

    // Update positions on tick
    simulation.on("tick", function() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`);

        label
            .attr("x", d => (d.class === 'Owner' ? 6 : 0))
            .attr("y", 0);
    });

    // Function to handle zoom
    function zoomed() {
        svg.attr("transform", d3.event.transform);
    }
});










