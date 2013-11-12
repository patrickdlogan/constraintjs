	/*jslint evil: true */

	var create_dom_element = function(tag) {
	};
	var create_dom_text = function(tag) {
	};
	var concat_elems = function() {
	};


	var default_container = "span";

	var parsed_var_fn_val = function(node) {
		var type = node.type;
		if(type === "prop") {
			var subtype = node.subtype;
			var parent = node.parent;
			var child = node.child;
			var parent_text = parsed_var_fn_val(parent);
			var child_text = parsed_var_fn_val(child);
			if(subtype === "square_brackets") {
				if(child.type === "constant" && child.subtype === "string") {
					child_text = '"' + child_text + '"';
				}

				return parent_text + ".item(" + child_text + ")";
			} else if(subtype === "dot") {
				return parent_text + ".item('" + child_text + "')";
			} else {
				console.log("Unknown type " + type + "/" + subtype);
			}
		} else if(type === "constant") {
			return node.value;
		} else if(type === "var") {
			return node.var_name;
		} else {
			console.log("Unknown type " + type);
		}
		return "'todo'";
	};

	var helpers = {};

	var to_fn_str = function(node) {
		var rv = "",
			type = isString(node) ? "string" : node.type,
			subtype, tag;
		if(type === "root") {
			if(node.children.length === 1 && node.children[0].type === "html") {
				rv = "return " + to_fn_str(node.children[0]) + ";";
			} else {
				rv = "return create_dom_element('" + default_container + "', {} // (root)\n";
				each(node.children, function(child) {
					var fn_str = to_fn_str(child);
					if(fn_str) {
						rv += ", " + fn_str;
					}
				});
				rv += "\n); // (/root)";
			}
		} else if(type === "string") {
			var text = node.split("\n").join("\\n");
			rv = "create_dom_text('"+text+"') // (text /)\n";
		} else if(type === "html") {
			subtype = node.subtype;
			if(subtype === "tag") {
				tag = node.value.tag_name;
				rv = "create_dom_element('" + tag + "',";
				if(node.attrs.length === 0) {
					rv += " {} // <" + tag + ">\n";
				} else {
					rv += " { // <" + tag + ">\n";
					each(node.attrs, function(attr, index) {
						var name = attr.name;
						var value = attr.value;
						rv += "\n";
						if(index>0) {
							rv += ", ";
						}
						rv += "'" + name + "': ";

						rv += "concat_elems(";
						rv += map(value, function(v) {
							if(isString(v)) {
								return "'" + v + "'";
							} else {
								var parsed_var_name = v.value.parsed_var_name;
								var node_code = parsed_var_fn_val(parsed_var_name);
								return node_code;
							}
						}).join(", ");
						rv += ")";
					});
					rv += "} \n";
				}

				each(node.children, function(child) {
					rv += "\n, " + to_fn_str(child);
				});
				rv += "\n) // </" + tag + ">\n";
			} else {
				console.log("Unhandled type html/" + subtype);
			}
		} else if(type === "mustache") {
			subtype = node.subtype;
			if(subtype === "variable") {
				var parsed_var_name = node.value.parsed_var_name;
				var node_code = parsed_var_fn_val(parsed_var_name);

				rv = "create_dom_text(" + node_code + ") // {{" + node.value.var_name + "}}\n";
			} else if(subtype === "section") {
				tag = node.value.tag;
				if(has(helpers, tag)) {
					rv = helpers[tag](node);
				} else {
					console.log("No helper registered for section " + tag);
				}
			} else {
				console.log("Unhandled type mustache/" + subtype);
			}
		} else {
			console.log("Unhandled type " + type);
		}
		return rv;

	};

	var parser = cjs.__parsers.handlebars;
	var ir_builder = cjs.__ir_builders.handlebars;
	var build_handlebars_template = function(str, data) {
		var parse_tree = parser(str);
		console.log(parse_tree);
		var ir = ir_builder(parse_tree),
			fn_string = "with (obj) {\n" +
						to_fn_str(ir) +
						"\n}";

		var fn;
		try {
			fn = new Function("obj", fn_string);
		} catch(e) {
			console.log(fn_string);
			throw e;
		}

		return data ? fn(data) : fn;
	};
	build_handlebars_template.register_helper = function(name, helper) {
		helpers[name] = helper;
	};
	cjs.__template_builders.handlebars = build_handlebars_template;

	build_handlebars_template.register_helper("if", function(node) {
		var parent = node.parent;
		var child_index = -1;
		var conditions = [node];
		var hit_if = false;
		for(var i = 0; i<parent.children.length; i++) {
			var child = parent.children[i];
			if(child === node) {
				hit_if = true;
			} else if(hit_if) {
				if(child.type === "mustache" && child.subtype === "section") {
					if(child.value.tag === "elif") {
						conditions.push(child);
					} else if(child.value.tag === "else") {
						conditions.push(child);
						break;
					} else {
						break;
					}
				} else {
					break;
				}
			}
		}

		var rv = "\ncjs.create('conditional_constraint', // {{#if}}\n";
		each(conditions, function(condition, index) {
			var parsed_attributes = condition.value.parsed_attributes;
			var condition_code = parsed_var_fn_val(parsed_attributes);

			var type = condition.value.tag;

			if(index > 0) { //if
				rv += ", ";
			}

			rv += "{ ";

			if(type !== "else") {
				rv += "condition: " + condition_code;
				rv += " // {{#" + type + " " + condition.value.attributes + "}}\n, ";
			}
			rv += "value: [";
			each(condition.children, function(c, i) {
				if(i>0) {
					rv += ", ";
				}
				rv += to_fn_str(c);
			});

			rv += "]} // {{/" + type + " " + condition.value.attributes + "}}\n";
		});
		rv += "\n) // {{/if}}\n";
		return rv;
	});
	build_handlebars_template.register_helper("elif", function(node) {
		return "";
	});
	build_handlebars_template.register_helper("else", function(node) {
		return "";
	});
	build_handlebars_template.register_helper("each", function(node) {
		var parsed_attributes = node.value.parsed_attributes;
		var collection_name, val_name, key_name;
		var attrs;
		if(parsed_attributes.type === "compound") {
			attrs = parsed_attributes.statements;
		} else {
			attrs = [parsed_attributes];
		}

		var rv;
		if(size(attrs) >= 1) {
			var collection_name_code = parsed_var_fn_val(attrs[0]);

			var val_name_code = (attrs.length >= 2) ? attrs[1].text : "value";
			var key_name_code = (attrs.length >= 3) ? attrs[2].text : "key";

			rv = collection_name_code + ".map(function(" + val_name_code + ", " + key_name_code + ") { // {{#each " + attrs[0].text + "}}\n";
			rv += "return [ // {{#each}}\n";
			each(node.children, function(child, index) {
				if(index > 0) {
					rv += ", ";
				}
				rv += to_fn_str(child);
			});
			rv += "];";
			rv += "}) // {{/each}}\n";
		}
		return rv;
	});

	build_handlebars_template.register_helper("diagram", function(node) {
		var diagram_name = parsed_var_fn_val(node.value.parsed_attributes);
		rv = "\ncjs.inFSM(" + diagram_name + ", { // {{#diagram " + diagram_name + "}}\n\n";
		var index=0;
		each(node.children, function(child) {
			if(child.type === "mustache" && child.subtype === "section" && child.value.tag === "state") {
				var state_name = parsed_var_fn_val(child.value.parsed_attributes);
				if(index > 0) {
					rv += ", ";
				}
				rv += "'" + state_name + "': [\n";

				each(child.children, function(c, i) {
					if(i>0) {
						rv += ", ";
					}
					rv += to_fn_str(c);
				});

				rv += "]";
				index++;
			}
		});
		rv += "}) // {/diagram}\n";
		return rv;
	});
