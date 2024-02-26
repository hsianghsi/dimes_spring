// Load data from the provided JSON file
d3.json("https://raw.githubusercontent.com/hsianghsi/dimes/master/dimesA.json").then(function (data) {

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
    }).map(node => ({ ...node, fx: null, fy: null })); // Add initial null fixed coordinates

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
        .force("charge", d3.forceManyBody().strength(d => (d.class === 'Owner' ? -90 : -40))) // Global charge force
        .force("center", d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2))
        .alphaDecay(0.025) // Adjust alpha decay rate
        .force("collide", d3.forceCollide(8).iterations(4)); // Add forceCollide

    // Add separate link forces for each class
    Object.keys(linksByClass).forEach(className => {
        const forceLink = d3.forceLink(linksByClass[className])
            .id(d => d.name)
            .distance(90)
            .strength(d => (d.source.class === className ? 2 : 1)); // Adjust strength based on class

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
        .enter().append("g")

    // Append circles for "OwnerName"
    node.filter(d => d.class === 'Owner')
    .append("circle")
    .attr("r", d => (d.class === 'A' ? 3 : calculateOwnerRadius(d)))
    .attr("fill", "orange")
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Append squares for "DBA"
    node.filter(d => d.class !== 'Owner')
    .append("rect")
    .attr("width", 6)
    .attr("height", 6)
    .attr("x", -3)
    .attr("y", -3)
    .attr("fill", d => (d.class === 'A' ? "blue" : "black"))
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add labels and connection counts to nodes
    const label = node.append("text")
        .text(d => d.name)
        .attr("font-size", 7)
        .attr("dx", 6)
        .attr("dy", 0);

    // Connection count for OwnerName nodes
    // const connectionCount = node.filter(d => d.class === 'Owner').append("text")
        // .text(d => `Count: ${calculateOwnerConnections(d)}`)
        // .attr("font-size", 7)
        // .attr("dx", 6)
        // .attr("dy", 16);

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
            .attr("x", d => (d.class === 'Owner' ? 4 : 0))
            .attr("y", 3);

        // connectionCount
        //     .text(d => `Count: ${calculateOwnerConnections(d)}`);
    });

    // Function to calculate OwnerName node radius based on degree
    function calculateOwnerRadius(ownerNode) {
        const uniqueConnections = new Set(links.filter(link => link.target === ownerNode).map(link => link.source.name));
        const connectionCount = 2*uniqueConnections.size;
        return Math.max(3, connectionCount); // Minimum radius of 3 to ensure visibility
    }

    // Function to calculate unique connections for OwnerName nodes
    function calculateOwnerConnections(ownerNode) {
        const uniqueConnections = new Set(links.filter(link => link.target === ownerNode).map(link => link.source.name));
        return uniqueConnections.size;
    }

    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Function to handle zoom
    function zoomed() {
        svg.attr("transform", d3.event.transform);
    }
});















