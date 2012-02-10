/*
   Graph: A way of keeping track of nodes and edges

   Depends on:
	core.js
	array_utils.js
*/
(function(cjs) {
var _ = cjs._;

//Assume that nodes are part of at most one graph ever
var Node = function(data) {
	this.data = data;
	this.outgoingEdges = [];
	this.incomingEdges = [];
};

Node.prototype.addOutgoingEdge = function(edge) {
	this.outgoingEdges.push(edge);
};
Node.prototype.addIncomingEdge = function(edge) {
	this.incomingEdges.push(edge);
};

Node.prototype.removeOutgoingEdge = function(edge) {
	_.remove(this.outgoingEdges, edge);
};
Node.prototype.removeIncomingEdge = function(edge) {
	_.remove(this.incomingEdges, edge);
};

Node.prototype.getOutgoing = function() {
	return this.outgoingEdges;
};
Node.prototype.getIncoming = function() {
	return this.incomingEdges;
};

Node.prototype.destroy = function() {
	this.incomingEdges.forEach(function(edge) {
		var fromNode = edge.fromNode;
		fromNode.removeOutgoingEdge(edge);
	});
	_.clear(this.incomingEdges);

	this.outgoingEdges.forEach(function(edge) {
		var toNode = edge.toNode;
		toNode.removeIncomingEdge(edge);
	});
	_.clear(this.outgoingEdges);
};

Node.prototype.pointsAt = function() {
	var rv = []
		, i;
	for(i = 0; i<this.outgoingEdges.length; i++) {
		var outgoingEdge = this.outgoingEdges[i];
		rv.push(outgoingEdge.toNode);
	}
	return rv;
};

Node.prototype.pointsAtMe = function() {
	var rv = []
		, i;
	for(i = 0; i<this.incomingEdges.length; i++) {
		var incomingEdge = this.incomingEdges[i];
		rv.push(incomingEdge.fromNode);
	}
	return rv;
};

Node.prototype.getEdgeTo = function(toNode) {
	var i;
	for(i = 0; i<this.outgoingEdges.length; i++) {
		var outgoingEdge = this.outgoingEdges[i];
		if(outgoingEdge.fromNode === this && outgoingEdge.toNode === toNode) { return outgoingEdge; }
	}
	return null;
};
Node.prototype.hasEdgeTo = function(toNode) {
	return this.getEdgeTo(toNode)!==null;
};

var Edge = function(fromNode, toNode) {
	this.fromNode = fromNode;
	this.toNode = toNode;
};

var Graph = function() {
};

Graph.prototype.hasEdge = function(arg0, arg1) {
	var fromNode, toNode, edge;
	if(arg0 instanceof Edge) {
		edge = arg0;
		fromNode = edge.fromNode;
		toNode = edge.toNode;
	}
	else {
		fromNode = arg0;
		toNode = arg1;
	}
	return fromNode.hasEdgeTo(toNode);
};
Graph.prototype.getEdge = function(fromNode, toNode) {
	return fromNode.getEdgeTo(toNode);
};
Graph.prototype.doAddEdge = function(edge) {
	edge.fromNode.addOutgoingEdge(edge);
	edge.toNode.addIncomingEdge(edge);

	return edge;
};
Graph.prototype.addEdge = function(arg0, arg1){
	var fromNode, toNode, edge;
	if(arg0 instanceof Edge) {
		edge = arg0;
		fromNode = edge.fromNode;
		toNode = edge.toNode;
	}
	else {
		fromNode = arg0;
		toNode = arg1;
		edge = new Edge(fromNode, toNode);
	}
	if(!this.hasEdge(fromNode, toNode)) {
		return this.doAddEdge(edge);
	}
	return null;
};

Graph.prototype.removeEdge = function(fromNode, toNode) {
	var edge = this.getEdge(fromNode, toNode);
	if(edge!==null) {
		fromNode.removeOutgoingEdge(edge);
		toNode.removeIncomingEdge(edge);
	}
	return edge;
};

Graph.prototype.hasNode = function(node) {
	return node instanceof Node;
};

Graph.prototype.addNode = function(data) {
	var node = new Node(data);
};

Graph.prototype.removeNode = function(node) {
	node.destroy();
};

cjs.define("graph", function() {
	return new Graph();
});

}(cjs));
