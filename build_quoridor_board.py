import bpy
import bmesh
import math
import random
from mathutils import Vector, Euler, Matrix

# ==============================================================================
# CLEANUP & SETUP
# ==============================================================================
def safe_clear_scene():
    """Clear all objects, meshes, materials, and node groups cleanly."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)
    for ng in list(bpy.data.node_groups):
        if ng.users == 0:
            bpy.data.node_groups.remove(ng)

def get_or_create_collection(name, parent_coll=None):
    if name in bpy.data.collections:
        coll = bpy.data.collections[name]
    else:
        coll = bpy.data.collections.new(name)
        if parent_coll:
            parent_coll.children.link(coll)
        else:
            bpy.context.scene.collection.children.link(coll)
    return coll

def setup_collections():
    root = get_or_create_collection("Quoridor_Game")
    return {
        "root": root,
        "base": get_or_create_collection("01_Base_Grass", root),
        "tiles": get_or_create_collection("02_Tiles", root),
        "walls": get_or_create_collection("03_Walls", root),
        "animals": get_or_create_collection("04_Animals", root),
        "lights": get_or_create_collection("05_Lighting_Camera", root),
    }

# ==============================================================================
# BMESH GEOMETRY HELPERS
# ==============================================================================
def make_box_mesh(name, size=(1.0, 1.0, 1.0), bevel_radius=0.0):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel_radius > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel_radius, segments=3, profile=0.5)
    # Keep flat planar faces sharp, smooth only the bevel chamfers!
    for f in bm.faces:
        is_planar = any(abs(abs(c) - 1.0) < 0.02 for c in f.normal)
        f.smooth = not is_planar
    bm.to_mesh(me)
    bm.free()
    me.update()
    return me

def make_sphere_mesh(name, radius=0.5, u_seg=20, v_seg=14, scale=(1.0, 1.0, 1.0), rot_euler=(0,0,0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u_seg, v_segments=v_seg, radius=radius)
    if rot_euler != (0,0,0):
        rot_mat = Matrix.Rotation(rot_euler[0], 4, 'X') @ Matrix.Rotation(rot_euler[1], 4, 'Y') @ Matrix.Rotation(rot_euler[2], 4, 'Z')
        bmesh.ops.transform(bm, matrix=rot_mat, verts=bm.verts)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me)
    bm.free()
    me.update()
    return me

def make_cone_mesh(name, r1=0.5, r2=0.0, depth=1.0, seg=14, scale=(1.0, 1.0, 1.0), rot_euler=(0,0,0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=depth)
    if rot_euler != (0,0,0):
        rot_mat = Matrix.Rotation(rot_euler[0], 4, 'X') @ Matrix.Rotation(rot_euler[1], 4, 'Y') @ Matrix.Rotation(rot_euler[2], 4, 'Z')
        bmesh.ops.transform(bm, matrix=rot_mat, verts=bm.verts)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me)
    bm.free()
    me.update()
    return me

def make_cylinder_mesh(name, radius=0.5, depth=1.0, seg=16, scale=(1.0, 1.0, 1.0), rot_euler=(0,0,0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=radius, radius2=radius, depth=depth)
    if rot_euler != (0,0,0):
        rot_mat = Matrix.Rotation(rot_euler[0], 4, 'X') @ Matrix.Rotation(rot_euler[1], 4, 'Y') @ Matrix.Rotation(rot_euler[2], 4, 'Z')
        bmesh.ops.transform(bm, matrix=rot_mat, verts=bm.verts)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me)
    bm.free()
    me.update()
    return me

def build_dense_grass_tufts_mesh(name, platform_half_width=5.80, num_per_side=44):
    """Creates stylized grass blade tufts scattered in a rich organic fringe along the sod embankment."""
    random.seed(101)
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    
    # 4 stylized blades per clump
    blade_defs = [
        # (ox, oy, h, lean_deg, yaw_deg, w)
        (0.00,  0.00, 0.36, 18,   0, 0.055),
        (-0.035, 0.015, 0.28, 28, -35, 0.048),
        ( 0.035, 0.015, 0.31, 26,  35, 0.048),
        ( 0.00,-0.020, 0.23, 15, 180, 0.042),
    ]
    
    sides = [
        (-platform_half_width,  platform_half_width, 1,  0,  0,  1,   0), # North
        (-platform_half_width, -platform_half_width, 1,  0,  0, -1, 180), # South
        ( platform_half_width, -platform_half_width, 0,  1,  1,  0, -90), # East
        (-platform_half_width, -platform_half_width, 0,  1, -1,  0,  90), # West
    ]
    
    span = platform_half_width * 2.0
    step = span / (num_per_side + 1)
    
    for sx, sy, dx, dy, nx, ny, base_yaw in sides:
        for i in range(1, num_per_side + 1):
            t = i * step + (random.random() - 0.5) * (step * 0.45)
            # Stagger in 2 subtle rows along the rim
            row_jitter = (random.random() - 0.5) * 0.14
            px = sx + dx * t + nx * (0.05 + row_jitter)
            py = sy + dy * t + ny * (0.05 + row_jitter)
            pz = -0.04 + (random.random() - 0.5) * 0.03
            
            sc = 0.90 + random.random() * 0.40
            yaw = base_yaw + (random.random() - 0.5) * 45.0
            rad_yaw = math.radians(yaw)
            rot_m = Matrix.Rotation(rad_yaw, 3, 'Z')
            
            for ox, oy, h, lean, b_yaw, w in blade_defs:
                rad_lean = math.radians(lean)
                rad_byaw = math.radians(b_yaw)
                b_rot = Matrix.Rotation(rad_byaw, 3, 'Z')
                
                cur_h = h * sc
                cur_w = w * sc
                
                v0 = Vector((-cur_w*0.5, 0, 0))
                v1 = Vector(( cur_w*0.5, 0, 0))
                
                mid_h = cur_h * 0.55
                mid_lean = math.sin(rad_lean * 0.6) * mid_h
                v2 = Vector((-cur_w*0.35, mid_lean, mid_h))
                v3 = Vector(( cur_w*0.35, mid_lean, mid_h))
                
                tip_lean = math.sin(rad_lean) * cur_h
                tip_h = math.cos(rad_lean) * cur_h
                v4 = Vector((0, tip_lean, tip_h))
                
                verts_local = [v0, v1, v3, v2, v4]
                verts_bm = []
                for v in verts_local:
                    v_world = rot_m @ (b_rot @ v + Vector((ox*sc, oy*sc, 0))) + Vector((px, py, pz))
                    verts_bm.append(bm.verts.new(v_world))
                    
                bm.verts.ensure_lookup_table()
                bm.faces.new([verts_bm[0], verts_bm[1], verts_bm[2], verts_bm[3]])
                bm.faces.new([verts_bm[3], verts_bm[2], verts_bm[4]])
                
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me)
    bm.free()
    me.update()
    return me

# ==============================================================================
# PROCEDURAL MATERIALS
# ==============================================================================
def create_materials():
    mats = {}

    def make_principled(name, base_color, roughness=0.5):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nodes = m.node_tree.nodes
        bsdf = nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs['Base Color'].default_value = base_color
            bsdf.inputs['Roughness'].default_value = roughness
        return m

    # 1. Realistic Honey-Amber Oak Timber Wood (Sampled & Matched to Reference Artwork)
    mat_wood = bpy.data.materials.new("Mat_Wooden_Tile")
    mat_wood.use_nodes = True
    nodes = mat_wood.node_tree.nodes
    links = mat_wood.node_tree.links
    nodes.clear()

    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (1800, 0)

    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (1500, 0)
    bsdf.inputs['Roughness'].default_value = 0.36
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    # Coordinates
    tex_coord = nodes.new('ShaderNodeTexCoord')
    tex_coord.location = (-1600, 0)

    obj_info = nodes.new('ShaderNodeObjectInfo')
    obj_info.location = (-1600, 300)

    # Derive per-tile hash offset from world location so each tile samples a unique part of the wood plank
    sep_loc = nodes.new('ShaderNodeSeparateXYZ')
    sep_loc.location = (-1400, 300)
    links.new(obj_info.outputs['Location'], sep_loc.inputs['Vector'])

    math_hash_x = nodes.new('ShaderNodeMath')
    math_hash_x.operation = 'MULTIPLY'
    math_hash_x.inputs[1].default_value = 1.93
    links.new(sep_loc.outputs['X'], math_hash_x.inputs[0])

    math_hash_y = nodes.new('ShaderNodeMath')
    math_hash_y.operation = 'MULTIPLY'
    math_hash_y.inputs[1].default_value = 2.87
    links.new(sep_loc.outputs['Y'], math_hash_y.inputs[0])

    math_hash_sum = nodes.new('ShaderNodeMath')
    math_hash_sum.operation = 'ADD'
    links.new(math_hash_x.outputs['Value'], math_hash_sum.inputs[0])
    links.new(math_hash_y.outputs['Value'], math_hash_sum.inputs[1])

    math_off_x = nodes.new('ShaderNodeMath')
    math_off_x.operation = 'SINE'
    links.new(math_hash_sum.outputs['Value'], math_off_x.inputs[0])

    math_off_y = nodes.new('ShaderNodeMath')
    math_off_y.operation = 'COSINE'
    links.new(math_hash_sum.outputs['Value'], math_off_y.inputs[0])

    math_scale_ox = nodes.new('ShaderNodeMath')
    math_scale_ox.operation = 'MULTIPLY'
    math_scale_ox.inputs[1].default_value = 0.85
    links.new(math_off_x.outputs['Value'], math_scale_ox.inputs[0])

    math_scale_oy = nodes.new('ShaderNodeMath')
    math_scale_oy.operation = 'MULTIPLY'
    math_scale_oy.inputs[1].default_value = 0.85
    links.new(math_off_y.outputs['Value'], math_scale_oy.inputs[0])

    comb_offset = nodes.new('ShaderNodeCombineXYZ')
    comb_offset.location = (-1100, 200)
    links.new(math_scale_ox.outputs['Value'], comb_offset.inputs['X'])
    links.new(math_scale_oy.outputs['Value'], comb_offset.inputs['Y'])
    comb_offset.inputs['Z'].default_value = 0.0

    # Base Mapping: Map 1.0m tile to wood texture
    map_base = nodes.new('ShaderNodeMapping')
    map_base.location = (-1100, -100)
    map_base.inputs['Scale'].default_value = (0.95, 0.95, 0.95)
    links.new(tex_coord.outputs['Object'], map_base.inputs['Vector'])
    links.new(comb_offset.outputs['Vector'], map_base.inputs['Location'])

    # Image Texture Node with Triplanar Box projection
    img_path = "/Users/vm/WebstormProjects/quoridors/textures/wood_tile_texture.jpg"
    tex_img = nodes.new('ShaderNodeTexImage')
    tex_img.location = (-800, 100)
    tex_img.image = bpy.data.images.load(img_path) if img_path not in bpy.data.images else bpy.data.images[img_path]
    tex_img.projection = 'BOX'
    tex_img.projection_blend = 0.15
    links.new(map_base.outputs['Vector'], tex_img.inputs['Vector'])

    # Color Grading: Natural warm honey oak / teak matching reference illustration
    color_grade = nodes.new('ShaderNodeHueSaturation')
    color_grade.location = (-400, 100)
    color_grade.inputs['Hue'].default_value = 0.495
    color_grade.inputs['Saturation'].default_value = 0.96 # Balanced natural timber warmth
    color_grade.inputs['Value'].default_value = 0.94
    links.new(tex_img.outputs['Color'], color_grade.inputs['Color'])

    # Dark Cut Sides & Bevel Shadows using Geometry Normal
    geom = nodes.new('ShaderNodeNewGeometry')
    geom.location = (-400, -250)

    sep_norm = nodes.new('ShaderNodeSeparateXYZ')
    sep_norm.location = (-200, -250)
    links.new(geom.outputs['Normal'], sep_norm.inputs['Vector'])

    mix_sides = nodes.new('ShaderNodeMix')
    mix_sides.data_type = 'RGBA'
    mix_sides.location = (200, 0)
    # Deep rich warm walnut for vertical sides (sRGB=(85, 42, 24) -> linear=(0.092, 0.024, 0.008))
    mix_sides.inputs[6].default_value = (0.12, 0.040, 0.014, 1.0)
    links.new(color_grade.outputs['Color'], mix_sides.inputs[7])
    links.new(sep_norm.outputs['Z'], mix_sides.inputs['Factor'])

    # Subtle per-tile brightness variation based on position hash (±6%)
    math_bright = nodes.new('ShaderNodeMath')
    math_bright.operation = 'MULTIPLY_ADD'
    math_bright.inputs[1].default_value = 0.08
    math_bright.inputs[2].default_value = 0.94
    links.new(math_off_x.outputs['Value'], math_bright.inputs[0])

    hue_sat = nodes.new('ShaderNodeHueSaturation')
    hue_sat.location = (500, 50)
    hue_sat.inputs['Hue'].default_value = 0.50
    hue_sat.inputs['Saturation'].default_value = 1.0
    links.new(math_bright.outputs['Value'], hue_sat.inputs['Value'])
    links.new(mix_sides.outputs[2], hue_sat.inputs['Color'])
    links.new(hue_sat.outputs['Color'], bsdf.inputs['Base Color'])

    # Tactile Normal Bump: Genuine wood grain relief from the high-res texture
    bump = nodes.new('ShaderNodeBump')
    bump.location = (500, -200)
    bump.inputs['Strength'].default_value = 0.10
    bump.inputs['Distance'].default_value = 0.015
    links.new(tex_img.outputs['Color'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

    # Roughness map: Satin sheen on polished amber wood (0.28), soft matte in wood pores (0.42)
    rough_ramp = nodes.new('ShaderNodeValToRGB')
    rough_ramp.location = (300, -350)
    rough_ramp.color_ramp.elements[0].position = 0.2
    rough_ramp.color_ramp.elements[0].color = (0.42, 0.42, 0.42, 1.0)
    rough_ramp.color_ramp.elements[1].position = 0.8
    rough_ramp.color_ramp.elements[1].color = (0.26, 0.26, 0.26, 1.0)
    links.new(tex_img.outputs['Color'], rough_ramp.inputs['Fac'])
    links.new(rough_ramp.outputs['Color'], bsdf.inputs['Roughness'])

    mats["wood"] = mat_wood

    # 2. Realistic Boxwood Hedge Material (Image Texture + Directional Normal-Z Shading + Leaf Bump)
    mat_hedge = bpy.data.materials.new("Mat_Hedge_Wall")
    mat_hedge.use_nodes = True
    nodes = mat_hedge.node_tree.nodes
    links = mat_hedge.node_tree.links
    nodes.clear()

    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (1400, 0)
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (1150, 0)
    bsdf.inputs['Roughness'].default_value = 0.50
    bsdf.inputs['Specular IOR Level'].default_value = 0.35
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    tex_coord = nodes.new('ShaderNodeTexCoord')
    tex_coord.location = (-1000, 0)

    map_hedge = nodes.new('ShaderNodeMapping')
    map_hedge.location = (-800, 0)
    map_hedge.inputs['Scale'].default_value = (3.6, 3.6, 3.6)
    links.new(tex_coord.outputs['Object'], map_hedge.inputs['Vector'])

    hedge_tex_path = "/Users/vm/WebstormProjects/quoridors/textures/hedge_leaf_texture.jpg"
    img_hedge = bpy.data.images.load(hedge_tex_path) if hedge_tex_path not in bpy.data.images else bpy.data.images[hedge_tex_path]
    tex_img_hedge = nodes.new('ShaderNodeTexImage')
    tex_img_hedge.location = (-550, 100)
    tex_img_hedge.image = img_hedge
    tex_img_hedge.projection = 'BOX'
    tex_img_hedge.projection_blend = 0.20
    links.new(map_hedge.outputs['Vector'], tex_img_hedge.inputs['Vector'])

    # Geometry Normal for Top vs Flank lighting
    geom = nodes.new('ShaderNodeNewGeometry')
    geom.location = (-550, -250)
    sep_norm = nodes.new('ShaderNodeSeparateXYZ')
    sep_norm.location = (-350, -250)
    links.new(geom.outputs['Normal'], sep_norm.inputs['Vector'])

    # Normal Z ColorRamp: Darker forest green on sides, bright chartreuse sunlit on top
    norm_ramp = nodes.new('ShaderNodeValToRGB')
    norm_ramp.location = (-150, -250)
    ncr = norm_ramp.color_ramp
    ncr.interpolation = 'EASE'
    ncr.elements[0].position = 0.05
    ncr.elements[0].color = (0.70, 0.88, 0.65, 1.0) # Deep forest multiplier for flanks
    ncr.elements[1].position = 0.55
    ncr.elements[1].color = (1.18, 1.30, 0.88, 1.0) # Sunlit warm lime multiplier for top
    links.new(sep_norm.outputs['Z'], norm_ramp.inputs['Fac'])

    # Multiply texture by directional lighting tint
    mix_col = nodes.new('ShaderNodeMix')
    mix_col.data_type = 'RGBA'
    mix_col.blend_type = 'MULTIPLY'
    mix_col.location = (200, 100)
    mix_col.inputs['Factor'].default_value = 0.85
    links.new(tex_img_hedge.outputs['Color'], mix_col.inputs[6])
    links.new(norm_ramp.outputs['Color'], mix_col.inputs[7])
    links.new(mix_col.outputs[2], bsdf.inputs['Base Color'])

    # Tactile leaf bump relief
    bump_hedge = nodes.new('ShaderNodeBump')
    bump_hedge.location = (650, -100)
    bump_hedge.inputs['Strength'].default_value = 0.35
    bump_hedge.inputs['Distance'].default_value = 0.025
    links.new(tex_img_hedge.outputs['Color'], bump_hedge.inputs['Height'])
    links.new(bump_hedge.outputs['Normal'], bsdf.inputs['Normal'])

    # Roughness map: leaves catch soft specular glints
    rough_ramp = nodes.new('ShaderNodeValToRGB')
    rough_ramp.location = (650, 150)
    rough_ramp.color_ramp.elements[0].position = 0.2
    rough_ramp.color_ramp.elements[0].color = (0.60, 0.60, 0.60, 1.0)
    rough_ramp.color_ramp.elements[1].position = 0.7
    rough_ramp.color_ramp.elements[1].color = (0.42, 0.42, 0.42, 1.0)
    links.new(tex_img_hedge.outputs['Color'], rough_ramp.inputs['Fac'])
    links.new(rough_ramp.outputs['Color'], bsdf.inputs['Roughness'])

    mats["hedge"] = mat_hedge

    # 3. Grass Field Lawn (Realistic Lawn Texture with Dark Forest Grooves & Sunny Perimeter Meadow)
    mat_grass = bpy.data.materials.new("Mat_Grass_Field")
    mat_grass.use_nodes = True
    nodes_g = mat_grass.node_tree.nodes
    links_g = mat_grass.node_tree.links
    nodes_g.clear()

    out_g = nodes_g.new('ShaderNodeOutputMaterial')
    out_g.location = (1400, 0)
    bsdf_g = nodes_g.new('ShaderNodeBsdfPrincipled')
    bsdf_g.location = (1150, 0)
    bsdf_g.inputs['Roughness'].default_value = 0.60
    links_g.new(bsdf_g.outputs['BSDF'], out_g.inputs['Surface'])

    tc_g = nodes_g.new('ShaderNodeTexCoord')
    tc_g.location = (-1000, 0)

    map_grass = nodes_g.new('ShaderNodeMapping')
    map_grass.location = (-800, 0)
    map_grass.inputs['Scale'].default_value = (1.6, 1.6, 1.6)
    links_g.new(tc_g.outputs['Object'], map_grass.inputs['Vector'])

    grass_tex_path = "/Users/vm/WebstormProjects/quoridors/textures/lawn_grass_texture.jpg"
    img_grass = bpy.data.images.load(grass_tex_path) if grass_tex_path not in bpy.data.images else bpy.data.images[grass_tex_path]
    tex_img_grass = nodes_g.new('ShaderNodeTexImage')
    tex_img_grass.location = (-550, 100)
    tex_img_grass.image = img_grass
    tex_img_grass.projection = 'BOX'
    tex_img_grass.projection_blend = 0.20
    links_g.new(map_grass.outputs['Vector'], tex_img_grass.inputs['Vector'])

    # Groove vs Open Lawn Mask: < 4.80 inside tile grid grooves, > 5.05 open perimeter lawn
    sep_g = nodes_g.new('ShaderNodeSeparateXYZ')
    sep_g.location = (-800, -300)
    links_g.new(tc_g.outputs['Object'], sep_g.inputs['Vector'])

    abs_x = nodes_g.new('ShaderNodeMath')
    abs_x.operation = 'ABSOLUTE'
    links_g.new(sep_g.outputs['X'], abs_x.inputs[0])

    abs_y = nodes_g.new('ShaderNodeMath')
    abs_y.operation = 'ABSOLUTE'
    links_g.new(sep_g.outputs['Y'], abs_y.inputs[0])

    max_xy = nodes_g.new('ShaderNodeMath')
    max_xy.operation = 'MAXIMUM'
    links_g.new(abs_x.outputs['Value'], max_xy.inputs[0])
    links_g.new(abs_y.outputs['Value'], max_xy.inputs[1])

    mask_ramp = nodes_g.new('ShaderNodeValToRGB')
    mask_ramp.location = (-350, -300)
    mcr = mask_ramp.color_ramp
    mcr.interpolation = 'LINEAR'
    mcr.elements[0].position = 4.80
    mcr.elements[0].color = (0.0, 0.0, 0.0, 1.0)
    mcr.elements[1].position = 5.05
    mcr.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    links_g.new(max_xy.outputs['Value'], mask_ramp.inputs['Fac'])

    # Color Grading for Grooves vs Lawn
    mix_lawn_col = nodes_g.new('ShaderNodeMix')
    mix_lawn_col.data_type = 'RGBA'
    mix_lawn_col.location = (-50, -200)
    # Slot 6: Dark forest moss / contact shadow for grooves
    mix_lawn_col.inputs[6].default_value = (0.24, 0.40, 0.18, 1.0)
    # Slot 7: Vibrant sunny emerald meadow tint for open perimeter lawn
    mix_lawn_col.inputs[7].default_value = (1.20, 1.35, 1.02, 1.0)
    links_g.new(mask_ramp.outputs['Color'], mix_lawn_col.inputs['Factor'])

    # Apply color grading to grass texture
    mix_final_grass = nodes_g.new('ShaderNodeMix')
    mix_final_grass.data_type = 'RGBA'
    mix_final_grass.blend_type = 'MULTIPLY'
    mix_final_grass.location = (250, 100)
    mix_final_grass.inputs['Factor'].default_value = 0.70
    links_g.new(tex_img_grass.outputs['Color'], mix_final_grass.inputs[6])
    links_g.new(mix_lawn_col.outputs[2], mix_final_grass.inputs[7])
    links_g.new(mix_final_grass.outputs[2], bsdf_g.inputs['Base Color'])

    # Tactile grass blade bump
    bump_grass = nodes_g.new('ShaderNodeBump')
    bump_grass.location = (650, -100)
    bump_grass.inputs['Strength'].default_value = 0.45
    bump_grass.inputs['Distance'].default_value = 0.035
    links_g.new(tex_img_grass.outputs['Color'], bump_grass.inputs['Height'])
    links_g.new(bump_grass.outputs['Normal'], bsdf_g.inputs['Normal'])

    mats["grass"] = mat_grass

    # 4. Stylized Grass Tuft Material (Textured with Gradient to Sunlit Chartreuse Tip)
    mat_tuft = bpy.data.materials.new("Mat_Grass_Tuft")
    mat_tuft.use_nodes = True
    nodes_t = mat_tuft.node_tree.nodes
    links_t = mat_tuft.node_tree.links
    nodes_t.clear()

    out_t = nodes_t.new('ShaderNodeOutputMaterial')
    out_t.location = (1100, 0)
    bsdf_t = nodes_t.new('ShaderNodeBsdfPrincipled')
    bsdf_t.location = (850, 0)
    bsdf_t.inputs['Roughness'].default_value = 0.45
    bsdf_t.inputs['Specular IOR Level'].default_value = 0.35
    links_t.new(bsdf_t.outputs['BSDF'], out_t.inputs['Surface'])

    tc_t = nodes_t.new('ShaderNodeTexCoord')
    tc_t.location = (-600, 100)

    # Sample grass texture for tuft surface details
    map_tuft = nodes_t.new('ShaderNodeMapping')
    map_tuft.location = (-400, 100)
    map_tuft.inputs['Scale'].default_value = (2.2, 2.2, 2.2)
    links_t.new(tc_t.outputs['Object'], map_tuft.inputs['Vector'])

    tex_img_tuft = nodes_t.new('ShaderNodeTexImage')
    tex_img_tuft.location = (-150, 200)
    tex_img_tuft.image = img_grass
    tex_img_tuft.projection = 'BOX'
    links_t.new(map_tuft.outputs['Vector'], tex_img_tuft.inputs['Vector'])

    # Z Gradient for blade tips
    sep_t = nodes_t.new('ShaderNodeSeparateXYZ')
    sep_t.location = (-400, -150)
    links_t.new(tc_t.outputs['Object'], sep_t.inputs['Vector'])

    tuft_ramp = nodes_t.new('ShaderNodeValToRGB')
    tuft_ramp.location = (-150, -150)
    tcr = tuft_ramp.color_ramp
    tcr.interpolation = 'EASE'
    tcr.elements[0].position = 0.00
    tcr.elements[0].color = (0.28, 0.65, 0.14, 1.0) # Fresh grass green base
    tcr.elements[1].position = 0.32
    tcr.elements[1].color = (0.80, 1.10, 0.25, 1.0) # Sun-drenched chartreuse blade tip
    links_t.new(sep_t.outputs['Z'], tuft_ramp.inputs['Fac'])

    # Blend texture with gradient
    mix_tuft = nodes_t.new('ShaderNodeMix')
    mix_tuft.data_type = 'RGBA'
    mix_tuft.blend_type = 'MULTIPLY'
    mix_tuft.location = (250, 100)
    mix_tuft.inputs['Factor'].default_value = 0.50
    links_t.new(tex_img_tuft.outputs['Color'], mix_tuft.inputs[6])
    links_t.new(tuft_ramp.outputs['Color'], mix_tuft.inputs[7])
    links_t.new(mix_tuft.outputs[2], bsdf_t.inputs['Base Color'])

    bump_tuft = nodes_t.new('ShaderNodeBump')
    bump_tuft.location = (550, -100)
    bump_tuft.inputs['Strength'].default_value = 0.35
    bump_tuft.inputs['Distance'].default_value = 0.025
    links_t.new(tex_img_tuft.outputs['Color'], bump_tuft.inputs['Height'])
    links_t.new(bump_tuft.outputs['Normal'], bsdf_t.inputs['Normal'])

    mats["grass_tuft"] = mat_tuft

    # 5. Dark Soil Base (visible beneath the lawn platform)
    mat_soil = bpy.data.materials.new("Mat_Soil_Base")
    mat_soil.use_nodes = True
    bsdf = mat_soil.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.07, 0.18, 0.06, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.85
    mats["soil"] = mat_soil

    # 5. Animal Specific Materials
    # Owl
    mats["owl_body"] = make_principled("Mat_Owl_Brown", (0.50, 0.26, 0.11, 1.0), 0.45)
    mats["owl_cream"] = make_principled("Mat_Owl_Cream", (0.96, 0.90, 0.78, 1.0), 0.40)
    mats["owl_beak"] = make_principled("Mat_Owl_Beak", (0.95, 0.60, 0.08, 1.0), 0.35)
    mats["owl_eyes"] = make_principled("Mat_Owl_Eyes_Yellow", (0.98, 0.75, 0.10, 1.0), 0.25)
    mats["owl_pupil"] = make_principled("Mat_Owl_Pupil_Dark", (0.04, 0.03, 0.03, 1.0), 0.20)
    mats["owl_feather_fleck"] = make_principled("Mat_Owl_Feather_Fleck", (0.38, 0.18, 0.07, 1.0), 0.50)

    # Fox
    mats["fox_orange"] = make_principled("Mat_Fox_Orange", (0.86, 0.30, 0.07, 1.0), 0.40)
    mats["fox_white"] = make_principled("Mat_Fox_White", (0.96, 0.95, 0.92, 1.0), 0.40)
    mats["fox_black"] = make_principled("Mat_Fox_Black", (0.07, 0.06, 0.06, 1.0), 0.35)

    # Bear
    mats["bear_brown"] = make_principled("Mat_Bear_Brown", (0.36, 0.19, 0.08, 1.0), 0.50)
    mats["bear_tan"] = make_principled("Mat_Bear_Tan", (0.76, 0.54, 0.34, 1.0), 0.45)
    mats["bear_nose"] = make_principled("Mat_Bear_Nose", (0.06, 0.05, 0.05, 1.0), 0.25)

    # Wolves
    mats["wolf_grey"] = make_principled("Mat_Wolf_Grey", (0.48, 0.53, 0.58, 1.0), 0.45)
    mats["wolf_white"] = make_principled("Mat_Wolf_White", (0.95, 0.96, 0.98, 1.0), 0.40)
    mats["wolf_inner_ear"] = make_principled("Mat_Wolf_Inner_Ear", (0.85, 0.70, 0.72, 1.0), 0.50)
    mats["wolf_nose"] = make_principled("Mat_Wolf_Nose", (0.05, 0.05, 0.05, 1.0), 0.25)
    mats["eye_dark"] = make_principled("Mat_Eye_Dark", (0.04, 0.04, 0.04, 1.0), 0.15)
    mats["eye_white"] = make_principled("Mat_Eye_White", (0.98, 0.98, 0.98, 1.0), 0.15)

    return mats

# ==============================================================================
# BOARD & GRASS BASE CONSTRUCTION
# ==============================================================================
def create_board_base_and_tiles(colls, mats):
    """
    Constructs:
    1. Base soil bed
    2. Lush lawn sod embankment platform extending 0.6m beyond tiles
    3. Dense stylized grass blade tufts fringing all 4 perimeter edges
    4. 81 individual wooden tiles (9x9) with beveled corners and random grain
    """
    # 1. Base Soil Bed
    soil_mesh = make_box_mesh("Mesh_Base_Soil", size=(12.8, 12.8, 0.40), bevel_radius=0.08)
    soil_obj = bpy.data.objects.new("Board_Base_Soil", soil_mesh)
    soil_obj.location = (0, 0, -0.25)
    soil_obj.data.materials.append(mats["soil"])
    colls["base"].objects.link(soil_obj)

    # 2. Lush Lawn Sod Embankment Platform
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((12.2, 12.2, 0.28)), verts=bm.verts)
    edges_to_bevel = [e for e in bm.edges if any(v.co.z > 0.1 for v in e.verts) or any(abs(v.co.x) > 5.9 and abs(v.co.y) > 5.9 for v in e.verts)]
    bmesh.ops.bevel(bm, geom=edges_to_bevel, offset=0.18, segments=4, profile=0.5, affect='EDGES')
    for f in bm.faces:
        f.smooth = True
    lawn_mesh = bpy.data.meshes.new("Mesh_Lawn_Platform")
    bm.to_mesh(lawn_mesh)
    bm.free()

    lawn_obj = bpy.data.objects.new("Board_Lawn_Platform", lawn_mesh)
    lawn_obj.location = (0, 0, -0.14)
    lawn_obj.data.materials.append(mats["grass"])
    colls["base"].objects.link(lawn_obj)

    # 3. Dense Stylized Grass Tufts Framing All 4 Perimeter Edges
    tufts_me = build_dense_grass_tufts_mesh("Mesh_Perimeter_Tufts", platform_half_width=5.80, num_per_side=44)
    tufts_obj = bpy.data.objects.new("Board_Grass_Tufts", tufts_me)
    tufts_obj.data.materials.append(mats["grass_tuft"])
    colls["base"].objects.link(tufts_obj)

    # 4. 81 Wooden Tiles (9x9 Grid)
    tile_master_mesh = make_box_mesh("Wooden_Tile_Master_Mesh", size=(1.0, 1.0, 0.24), bevel_radius=0.045)
    tile_master_mesh.materials.append(mats["wood"])

    grid_n = 9
    pitch = 1.20 # 1.0m tile + 0.2m groove
    half_span = (grid_n - 1) * pitch / 2.0 # 4.8m

    random.seed(101)
    tiles = {}
    for r in range(grid_n):
        for c in range(grid_n):
            x = -half_span + c * pitch
            y = half_span - r * pitch
            tile_obj = bpy.data.objects.new(f"Tile_{r}_{c}", tile_master_mesh)
            tile_obj.location = (x, y, 0.0)
            angle = random.choice([0, math.pi/2, math.pi, -math.pi/2])
            skew = (random.random() - 0.5) * 0.04
            tile_obj.rotation_euler = Euler((0, 0, angle + skew), 'XYZ')
            colls["tiles"].objects.link(tile_obj)
            tiles[(r, c)] = tile_obj

    return tiles

# ==============================================================================
# PARAMETRIC HEDGE WALL (GEOMETRY NODES)
# ==============================================================================
def create_hedge_geometry_node_group(mat_hedge):
    """Creates parametric Geometry Nodes group for clipped, solid boxwood hedge with adjustable 'Length'."""
    ng_name = "GN_Hedge_Wall"
    if ng_name in bpy.data.node_groups:
        return bpy.data.node_groups[ng_name]

    ng = bpy.data.node_groups.new(ng_name, 'GeometryNodeTree')
    nodes = ng.nodes
    links = ng.links
    nodes.clear()

    inp = nodes.new('NodeGroupInput')
    inp.location = (-700, 0)
    out = nodes.new('NodeGroupOutput')
    out.location = (950, 0)

    ng.interface.new_socket("Geometry", in_out='INPUT', socket_type='NodeSocketGeometry')
    sock_len = ng.interface.new_socket("Length", in_out='INPUT', socket_type='NodeSocketFloat')
    sock_len.default_value = 2.20
    sock_len.min_value = 0.40
    sock_len.max_value = 12.00
    ng.interface.new_socket("Geometry", in_out='OUTPUT', socket_type='NodeSocketGeometry')

    # Mesh Box with high subdivisions for smooth rounded bevels
    cube = nodes.new('GeometryNodeMeshCube')
    cube.location = (-450, 100)
    cube.inputs['Vertices X'].default_value = 20
    cube.inputs['Vertices Y'].default_value = 8
    cube.inputs['Vertices Z'].default_value = 14

    comb_size = nodes.new('ShaderNodeCombineXYZ')
    comb_size.location = (-450, -100)
    links.new(inp.outputs['Length'], comb_size.inputs['X'])
    comb_size.inputs['Y'].default_value = 0.26 # Snug hedge thickness
    comb_size.inputs['Z'].default_value = 0.88 # Full hurdle height
    links.new(comb_size.outputs['Vector'], cube.inputs['Size'])

    # Shift Z up so base rests on grass floor in groove
    trans = nodes.new('GeometryNodeTransform')
    trans.location = (-200, 100)
    trans.inputs['Translation'].default_value = (0, 0, 0.44)
    links.new(cube.outputs['Mesh'], trans.inputs['Geometry'])

    # Subsurf rounds top edges and vertical corners
    subsurf = nodes.new('GeometryNodeSubdivisionSurface')
    subsurf.location = (0, 100)
    subsurf.inputs['Level'].default_value = 1
    links.new(trans.outputs['Geometry'], subsurf.inputs['Mesh'])

    # Organic leaf noise displacement for natural topiary silhouette
    noise_ng = nodes.new('ShaderNodeTexNoise')
    noise_ng.location = (0, -150)
    noise_ng.inputs['Scale'].default_value = 15.0
    noise_ng.inputs['Detail'].default_value = 2.0

    math_sub = nodes.new('ShaderNodeMath')
    math_sub.location = (200, -150)
    math_sub.operation = 'SUBTRACT'
    math_sub.inputs[1].default_value = 0.5
    links.new(noise_ng.outputs['Fac'], math_sub.inputs[0])

    math_scale = nodes.new('ShaderNodeMath')
    math_scale.location = (350, -150)
    math_scale.operation = 'MULTIPLY'
    math_scale.inputs[1].default_value = 0.038
    links.new(math_sub.outputs['Value'], math_scale.inputs[0])

    norm_ng = nodes.new('GeometryNodeInputNormal')
    norm_ng.location = (200, -300)

    scale_vec = nodes.new('ShaderNodeVectorMath')
    scale_vec.location = (500, -200)
    scale_vec.operation = 'SCALE'
    links.new(norm_ng.outputs['Normal'], scale_vec.inputs['Vector'])
    links.new(math_scale.outputs['Value'], scale_vec.inputs['Scale'])

    set_pos = nodes.new('GeometryNodeSetPosition')
    set_pos.location = (450, 100)
    links.new(subsurf.outputs['Mesh'], set_pos.inputs['Geometry'])
    links.new(scale_vec.outputs['Vector'], set_pos.inputs['Offset'])

    smooth_ng = nodes.new('GeometryNodeSetShadeSmooth')
    smooth_ng.location = (650, 100)
    links.new(set_pos.outputs['Geometry'], smooth_ng.inputs['Geometry'])

    set_mat = nodes.new('GeometryNodeSetMaterial')
    set_mat.location = (800, 100)
    set_mat.inputs['Material'].default_value = mat_hedge
    links.new(smooth_ng.outputs['Geometry'], set_mat.inputs['Geometry'])
    links.new(set_mat.outputs['Geometry'], out.inputs['Geometry'])

    return ng

def spawn_hedge_wall(name, loc, rot_z_deg, length, coll, gn_group, mat_hedge):
    """Spawns a clean, solid, adjustable hedge wall object with Geometry Nodes modifier."""
    dummy_me = bpy.data.meshes.new(f"Mesh_{name}")
    obj = bpy.data.objects.new(name, dummy_me)
    obj.location = loc
    obj.rotation_euler = Euler((0, 0, math.radians(rot_z_deg)), 'XYZ')
    coll.objects.link(obj)

    mod = obj.modifiers.new(name="Adjustable_Length", type='NODES')
    mod.node_group = gn_group
    # Set length parameter dynamically based on interface socket
    for item in gn_group.interface.items_tree:
        if item.item_type == 'SOCKET' and item.in_out == 'INPUT' and 'length' in item.name.lower():
            mod[item.identifier] = length
            break

    return obj

def create_all_hedge_walls(colls, mats):
    """
    Creates the labyrinth hedge walls matching quoridors_design.jpeg:
    - Nook enclosing the Grey Wolf on the left
    - Wall behind Bear & White Wolf
    - Prominent front-center wall
    - Garden maze enclosing the Fox on the right
    - Upper-right wall
    """
    gn_group = create_hedge_geometry_node_group(mats["hedge"])
    walls = []

    # Wall Layout coordinates (pitch = 1.2, grooves at -4.2, -3.0, -1.8, -0.6, 0.6, 1.8, 3.0, 4.2)
    wall_definitions = [
        # 1. Left Hedge Enclosure for Grey Wolf
        ("Wall_Wolf_Left_Outer", (-4.2, 1.2, 0.0), 90, 2.20),
        ("Wall_Wolf_Left_Back",  (-3.0, 1.8, 0.0), 0,  2.20),
        ("Wall_Wolf_Left_Front", (-3.0, -0.6, 0.0), 0, 2.20),
        ("Wall_Wolf_Left_Inner", (-1.8, 0.6, 0.0), 90, 2.20),

        # 2. Behind Bear & White Wolf (Top area)
        ("Wall_Bear_Wolf_Back",  (-0.6, 3.0, 0.0), 0,  3.40),

        # 3. Center-Front Wall
        ("Wall_Center_Front",    (0.6, -1.8, 0.0), 90, 2.20),

        # 4. Upper-Right Wall
        ("Wall_Top_Right",       (3.0, 3.0, 0.0),  90, 2.20),

        # 5. Fox Garden Maze (Right area)
        ("Wall_Fox_Maze_Left",   (1.8, 0.6, 0.0),  90, 2.20),
        ("Wall_Fox_Maze_Top",    (3.0, 0.6, 0.0),  0,  2.20),
        ("Wall_Fox_Maze_Right",  (4.2, -0.6, 0.0), 90, 2.20),
    ]

    for name, loc, rot_z, length in wall_definitions:
        w = spawn_hedge_wall(name, loc, rot_z, length, colls["walls"], gn_group, mats["hedge"])
        walls.append(w)

    return walls

# ==============================================================================
# HIGH-DETAIL FIGURINES
# ==============================================================================
def create_sub_mesh_part(name, mesh, loc, rot, scale, mat, parent, coll):
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    obj.rotation_euler = Euler(rot, 'XYZ')
    obj.scale = scale
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    coll.objects.link(obj)
    return obj

# 1. OWL FIGURINE (Heart facial disc, ear tufts, cartoon eyes, feather flecks, 3-toed feet)
def build_owl(colls, mats, base_pos=(1.2, 0.0, 0.12), rot_z=20):
    root = bpy.data.objects.new("Animal_Owl", None)
    root.empty_display_type = 'ARROWS'
    root.empty_display_size = 0.4
    root.location = base_pos
    root.rotation_euler = Euler((0, 0, math.radians(rot_z)), 'XYZ')
    colls["animals"].objects.link(root)

    # Body: Rounded pear/egg shape in warm brown
    body_mesh = make_sphere_mesh("Owl_Body_Mesh", radius=0.42, scale=(1.0, 0.88, 1.25))
    create_sub_mesh_part("Owl_Body", body_mesh, (0, 0, 0.52), (math.radians(-4), 0, 0), (1, 1, 1), mats["owl_body"], root, colls["animals"])

    # Ear Tufts ("Horns"): Pointed feather tufts on top of head
    tuft_mesh = make_cone_mesh("Owl_Tuft_Mesh", r1=0.08, r2=0.01, depth=0.22)
    create_sub_mesh_part("Owl_Tuft_L", tuft_mesh, (-0.20, 0.02, 1.05), (math.radians(10), math.radians(-25), 0), (1, 1, 1), mats["owl_body"], root, colls["animals"])
    create_sub_mesh_part("Owl_Tuft_R", tuft_mesh, (0.20, 0.02, 1.05), (math.radians(10), math.radians(25), 0), (1, 1, 1), mats["owl_body"], root, colls["animals"])

    # Heart Facial Disc: Cream heart-shaped face
    face_disc_mesh = make_sphere_mesh("Owl_Face_Disc", radius=0.28, scale=(1.20, 0.35, 0.95))
    create_sub_mesh_part("Owl_Face_Disc", face_disc_mesh, (0, -0.32, 0.72), (math.radians(8), 0, 0), (1, 1, 1), mats["owl_cream"], root, colls["animals"])

    # Eyebrow Ridges: Inward-angled brows for cute expressive look
    brow_mesh = make_cylinder_mesh("Owl_Brow", radius=0.035, depth=0.26)
    create_sub_mesh_part("Owl_Brow_L", brow_mesh, (-0.14, -0.38, 0.86), (0, math.radians(22), 0), (1, 1, 1), mats["owl_body"], root, colls["animals"])
    create_sub_mesh_part("Owl_Brow_R", brow_mesh, (0.14, -0.38, 0.86), (0, math.radians(-22), 0), (1, 1, 1), mats["owl_body"], root, colls["animals"])

    # Large Cartoon Eyes
    eye_sclera = make_sphere_mesh("Owl_Eye_Sclera", radius=0.10, scale=(1, 0.5, 1))
    create_sub_mesh_part("Owl_Eye_L", eye_sclera, (-0.14, -0.40, 0.74), (0, 0, 0), (1, 1, 1), mats["owl_eyes"], root, colls["animals"])
    create_sub_mesh_part("Owl_Eye_R", eye_sclera, (0.14, -0.40, 0.74), (0, 0, 0), (1, 1, 1), mats["owl_eyes"], root, colls["animals"])

    pupil = make_sphere_mesh("Owl_Pupil", radius=0.065, scale=(1, 0.5, 1))
    create_sub_mesh_part("Owl_Pupil_L", pupil, (-0.13, -0.44, 0.74), (0, 0, 0), (1, 1, 1), mats["owl_pupil"], root, colls["animals"])
    create_sub_mesh_part("Owl_Pupil_R", pupil, (0.13, -0.44, 0.74), (0, 0, 0), (1, 1, 1), mats["owl_pupil"], root, colls["animals"])

    # Catchlight highlights
    catchlight = make_sphere_mesh("Owl_Catchlight", radius=0.024)
    create_sub_mesh_part("Owl_Catchlight_L", catchlight, (-0.11, -0.47, 0.76), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])
    create_sub_mesh_part("Owl_Catchlight_R", catchlight, (0.15, -0.47, 0.76), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])

    # Beak: Golden triangle beak
    beak_mesh = make_cone_mesh("Owl_Beak_Mesh", r1=0.065, r2=0.01, depth=0.14)
    create_sub_mesh_part("Owl_Beak", beak_mesh, (0, -0.44, 0.65), (math.radians(-75), 0, 0), (1, 1, 1), mats["owl_beak"], root, colls["animals"])

    # Belly Bib: Cream chest
    belly_mesh = make_sphere_mesh("Owl_Belly_Mesh", radius=0.32, scale=(0.95, 0.40, 1.15))
    create_sub_mesh_part("Owl_Belly", belly_mesh, (0, -0.26, 0.42), (math.radians(5), 0, 0), (1, 1, 1), mats["owl_cream"], root, colls["animals"])

    # Feather V-flecks on belly
    fleck_mesh = make_cone_mesh("Owl_Fleck_Mesh", r1=0.025, r2=0.005, depth=0.06)
    fleck_coords = [
        (-0.10, -0.38, 0.50), (0.10, -0.38, 0.50),
        (0.00, -0.40, 0.44),
        (-0.12, -0.37, 0.38), (0.12, -0.37, 0.38),
        (0.00, -0.38, 0.32)
    ]
    for idx, fc in enumerate(fleck_coords):
        create_sub_mesh_part(f"Owl_Fleck_{idx}", fleck_mesh, fc, (math.radians(80), 0, 0), (1, 1, 1), mats["owl_feather_fleck"], root, colls["animals"])

    # Folded Wings on sides
    wing_mesh = make_sphere_mesh("Owl_Wing_Mesh", radius=0.32, scale=(0.35, 0.75, 1.35))
    create_sub_mesh_part("Owl_Wing_L", wing_mesh, (-0.38, 0.05, 0.50), (math.radians(12), math.radians(-10), math.radians(5)), (1, 1, 1), mats["owl_body"], root, colls["animals"])
    create_sub_mesh_part("Owl_Wing_R", wing_mesh, (0.38, 0.05, 0.50), (math.radians(12), math.radians(10), math.radians(-5)), (1, 1, 1), mats["owl_body"], root, colls["animals"])

    # Feet: Golden perched 3-claw feet
    toe_mesh = make_cylinder_mesh("Owl_Toe", radius=0.025, depth=0.14)
    for side, sign in [("L", -1), ("R", 1)]:
        foot_x = sign * 0.16
        for t_idx, t_angle in enumerate([-25, 0, 25]):
            create_sub_mesh_part(f"Owl_Toe_{side}_{t_idx}", toe_mesh, (foot_x + sign * (t_angle*0.002), -0.22, 0.06), (math.radians(90), 0, math.radians(t_angle)), (1, 1, 1), mats["owl_beak"], root, colls["animals"])

    return root

# 2. FOX FIGURINE (Pointed snout, white puffed cheeks, black ears with white fluff, stockings, bushy white-tipped tail)
def build_fox(colls, mats, base_pos=(3.6, -1.2, 0.12), rot_z=-125):
    root = bpy.data.objects.new("Animal_Fox", None)
    root.empty_display_type = 'ARROWS'
    root.empty_display_size = 0.4
    root.location = base_pos
    root.rotation_euler = Euler((0, 0, math.radians(rot_z)), 'XYZ')
    colls["animals"].objects.link(root)

    # Torso: Slender red-orange canid body
    torso_mesh = make_sphere_mesh("Fox_Torso_Mesh", radius=0.32, scale=(0.75, 1.35, 0.85))
    create_sub_mesh_part("Fox_Torso", torso_mesh, (0, 0.0, 0.42), (math.radians(-10), 0, 0), (1, 1, 1), mats["fox_orange"], root, colls["animals"])

    # White Chest Bib
    chest_mesh = make_sphere_mesh("Fox_Chest_Mesh", radius=0.22, scale=(0.70, 0.90, 1.10))
    create_sub_mesh_part("Fox_Chest", chest_mesh, (0, -0.24, 0.44), (math.radians(15), 0, 0), (1, 1, 1), mats["fox_white"], root, colls["animals"])

    # Neck
    neck_mesh = make_cylinder_mesh("Fox_Neck_Mesh", radius=0.15, depth=0.28)
    create_sub_mesh_part("Fox_Neck", neck_mesh, (0, -0.28, 0.58), (math.radians(35), 0, 0), (1, 1, 1), mats["fox_orange"], root, colls["animals"])

    # Head
    head_mesh = make_sphere_mesh("Fox_Head_Mesh", radius=0.22, scale=(0.95, 1.15, 0.90))
    create_sub_mesh_part("Fox_Head", head_mesh, (0, -0.42, 0.72), (math.radians(5), 0, 0), (1, 1, 1), mats["fox_orange"], root, colls["animals"])

    # White Cheeks
    cheek_mesh = make_sphere_mesh("Fox_Cheek_Mesh", radius=0.12, scale=(1.2, 0.9, 0.8))
    create_sub_mesh_part("Fox_Cheek_L", cheek_mesh, (-0.14, -0.46, 0.68), (0, 0, math.radians(20)), (1, 1, 1), mats["fox_white"], root, colls["animals"])
    create_sub_mesh_part("Fox_Cheek_R", cheek_mesh, (0.14, -0.46, 0.68), (0, 0, math.radians(-20)), (1, 1, 1), mats["fox_white"], root, colls["animals"])

    # Snout & Muzzle: Pointed triangular snout
    snout_mesh = make_cone_mesh("Fox_Snout_Mesh", r1=0.12, r2=0.03, depth=0.22)
    create_sub_mesh_part("Fox_Snout", snout_mesh, (0, -0.60, 0.68), (math.radians(85), 0, 0), (1, 1, 1), mats["fox_orange"], root, colls["animals"])

    # White Under-Muzzle
    snout_white = make_box_mesh("Fox_Snout_White", size=(0.12, 0.18, 0.06), bevel_radius=0.02)
    create_sub_mesh_part("Fox_Muzzle_White", snout_white, (0, -0.58, 0.64), (math.radians(10), 0, 0), (1, 1, 1), mats["fox_white"], root, colls["animals"])

    # Nose
    nose_mesh = make_sphere_mesh("Fox_Nose_Mesh", radius=0.04)
    create_sub_mesh_part("Fox_Nose", nose_mesh, (0, -0.71, 0.69), (0, 0, 0), (1, 1, 1), mats["fox_black"], root, colls["animals"])

    # Eyes: Sleek dark almond eyes on head surface with catchlights
    eye_mesh = make_sphere_mesh("Fox_Eye_Mesh", radius=0.040, scale=(1.0, 0.35, 1.1))
    create_sub_mesh_part("Fox_Eye_L", eye_mesh, (-0.106, -0.615, 0.786), (math.radians(-25), math.radians(-15), math.radians(15)), (1, 1, 1), mats["eye_dark"], root, colls["animals"])
    create_sub_mesh_part("Fox_Eye_R", eye_mesh, (0.106, -0.615, 0.786), (math.radians(-25), math.radians(15), math.radians(-15)), (1, 1, 1), mats["eye_dark"], root, colls["animals"])

    catch_mesh = make_sphere_mesh("Fox_Catch_Mesh", radius=0.012)
    create_sub_mesh_part("Fox_Catch_L", catch_mesh, (-0.114, -0.630, 0.796), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])
    create_sub_mesh_part("Fox_Catch_R", catch_mesh, (0.114, -0.630, 0.796), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])

    # Ears: Tall upright black-backed ears with white inner fluff
    ear_mesh = make_cone_mesh("Fox_Ear_Mesh", r1=0.10, r2=0.01, depth=0.28)
    create_sub_mesh_part("Fox_Ear_L", ear_mesh, (-0.14, -0.36, 0.96), (math.radians(-15), math.radians(-20), 0), (0.7, 1.0, 1.0), mats["fox_black"], root, colls["animals"])
    create_sub_mesh_part("Fox_Ear_R", ear_mesh, (0.14, -0.36, 0.96), (math.radians(-15), math.radians(20), 0), (0.7, 1.0, 1.0), mats["fox_black"], root, colls["animals"])

    ear_inner = make_cone_mesh("Fox_Ear_Inner", r1=0.065, r2=0.008, depth=0.22)
    create_sub_mesh_part("Fox_Ear_In_L", ear_inner, (-0.13, -0.38, 0.95), (math.radians(-12), math.radians(-20), 0), (0.6, 0.8, 0.9), mats["fox_white"], root, colls["animals"])
    create_sub_mesh_part("Fox_Ear_In_R", ear_inner, (0.13, -0.38, 0.95), (math.radians(-12), math.radians(20), 0), (0.6, 0.8, 0.9), mats["fox_white"], root, colls["animals"])

    # Legs & Stockings: 4 legs with black boots
    leg_upper = make_cylinder_mesh("Fox_Leg_Upper", radius=0.065, depth=0.24)
    leg_lower = make_cylinder_mesh("Fox_Leg_Lower", radius=0.050, depth=0.22)
    paw_mesh = make_sphere_mesh("Fox_Paw_Mesh", radius=0.060, scale=(0.9, 1.2, 0.6))

    leg_positions = [
        ("FL", -0.14, -0.22),
        ("FR",  0.14, -0.22),
        ("BL", -0.15,  0.26),
        ("BR",  0.15,  0.26),
    ]
    for tag, lx, ly in leg_positions:
        create_sub_mesh_part(f"Fox_Leg_Up_{tag}", leg_upper, (lx, ly, 0.28), (0, 0, 0), (1, 1, 1), mats["fox_orange"], root, colls["animals"])
        create_sub_mesh_part(f"Fox_Leg_Low_{tag}", leg_lower, (lx, ly, 0.12), (0, 0, 0), (1, 1, 1), mats["fox_black"], root, colls["animals"])
        create_sub_mesh_part(f"Fox_Paw_{tag}", paw_mesh, (lx, ly - 0.03, 0.04), (0, 0, 0), (1, 1, 1), mats["fox_black"], root, colls["animals"])

    # Bushy Tail with White Tip
    tail_base = make_sphere_mesh("Fox_Tail_Base", radius=0.16, scale=(1.0, 1.4, 1.0))
    create_sub_mesh_part("Fox_Tail_Base", tail_base, (0, 0.44, 0.44), (math.radians(35), 0, 0), (1, 1, 1), mats["fox_orange"], root, colls["animals"])

    tail_mid = make_sphere_mesh("Fox_Tail_Mid", radius=0.18, scale=(1.1, 1.6, 1.1))
    create_sub_mesh_part("Fox_Tail_Mid", tail_mid, (0, 0.64, 0.54), (math.radians(20), 0, 0), (1, 1, 1), mats["fox_orange"], root, colls["animals"])

    tail_tip = make_cone_mesh("Fox_Tail_Tip", r1=0.16, r2=0.02, depth=0.28)
    create_sub_mesh_part("Fox_Tail_Tip", tail_tip, (0, 0.86, 0.60), (math.radians(-75), 0, 0), (1, 1, 1), mats["fox_white"], root, colls["animals"])

    return root

# 3. BEAR FIGURINE (Shoulder hump, tan muzzle, round ears with tan centers, sturdy legs, bobtail)
def build_bear(colls, mats, base_pos=(-2.4, 2.4, 0.12), rot_z=65):
    root = bpy.data.objects.new("Animal_Bear", None)
    root.empty_display_type = 'ARROWS'
    root.empty_display_size = 0.4
    root.location = base_pos
    root.rotation_euler = Euler((0, 0, math.radians(rot_z)), 'XYZ')
    colls["animals"].objects.link(root)

    # Main Torso: Heavy, solid brown body
    body_mesh = make_sphere_mesh("Bear_Body_Mesh", radius=0.48, scale=(1.0, 1.45, 1.05))
    create_sub_mesh_part("Bear_Body", body_mesh, (0, 0.0, 0.54), (math.radians(-6), 0, 0), (1, 1, 1), mats["bear_brown"], root, colls["animals"])

    # Muscular Shoulder Hump (Characteristic grizzly silhouette)
    hump_mesh = make_sphere_mesh("Bear_Hump_Mesh", radius=0.34, scale=(1.05, 1.15, 0.95))
    create_sub_mesh_part("Bear_Hump", hump_mesh, (0, -0.22, 0.74), (math.radians(10), 0, 0), (1, 1, 1), mats["bear_brown"], root, colls["animals"])

    # Head
    head_mesh = make_sphere_mesh("Bear_Head_Mesh", radius=0.30, scale=(1.05, 1.15, 1.0))
    create_sub_mesh_part("Bear_Head", head_mesh, (0, -0.56, 0.70), (math.radians(4), 0, 0), (1, 1, 1), mats["bear_brown"], root, colls["animals"])

    # Tan Muzzle
    muzzle_mesh = make_sphere_mesh("Bear_Muzzle_Mesh", radius=0.18, scale=(1.0, 1.25, 0.85))
    create_sub_mesh_part("Bear_Muzzle", muzzle_mesh, (0, -0.80, 0.63), (math.radians(2), 0, 0), (1, 1, 1), mats["bear_tan"], root, colls["animals"])

    # Black Bear Nose
    nose_mesh = make_sphere_mesh("Bear_Nose_Mesh", radius=0.065, scale=(1.2, 0.8, 0.9))
    create_sub_mesh_part("Bear_Nose", nose_mesh, (0, -1.02, 0.67), (0, 0, 0), (1, 1, 1), mats["bear_nose"], root, colls["animals"])

    # Dark Eyes: Inlaid round dark glossy bead eyes flush with skull
    eye_mesh = make_sphere_mesh("Bear_Eye_Mesh", radius=0.045, scale=(1.0, 0.35, 1.0))
    create_sub_mesh_part("Bear_Eye_L", eye_mesh, (-0.187, -0.820, 0.767), (math.radians(-20), math.radians(-35), math.radians(20)), (1, 1, 1), mats["eye_dark"], root, colls["animals"])
    create_sub_mesh_part("Bear_Eye_R", eye_mesh, (0.187, -0.820, 0.767), (math.radians(-20), math.radians(35), math.radians(-20)), (1, 1, 1), mats["eye_dark"], root, colls["animals"])

    catch_mesh = make_sphere_mesh("Bear_Catch", radius=0.013)
    create_sub_mesh_part("Bear_Catch_L", catch_mesh, (-0.198, -0.835, 0.776), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])
    create_sub_mesh_part("Bear_Catch_R", catch_mesh, (0.198, -0.835, 0.776), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])

    # Round Ears with Tan Center
    ear_mesh = make_sphere_mesh("Bear_Ear_Mesh", radius=0.12, scale=(1.0, 0.45, 1.0))
    create_sub_mesh_part("Bear_Ear_L", ear_mesh, (-0.24, -0.48, 0.92), (0, math.radians(-20), 0), (1, 1, 1), mats["bear_brown"], root, colls["animals"])
    create_sub_mesh_part("Bear_Ear_R", ear_mesh, (0.24, -0.48, 0.92), (0, math.radians(20), 0), (1, 1, 1), mats["bear_brown"], root, colls["animals"])

    ear_inner = make_sphere_mesh("Bear_Ear_Inner", radius=0.075, scale=(1.0, 0.35, 1.0))
    create_sub_mesh_part("Bear_Ear_In_L", ear_inner, (-0.24, -0.50, 0.92), (0, math.radians(-20), 0), (1, 1, 1), mats["bear_tan"], root, colls["animals"])
    create_sub_mesh_part("Bear_Ear_In_R", ear_inner, (0.24, -0.50, 0.92), (0, math.radians(20), 0), (1, 1, 1), mats["bear_tan"], root, colls["animals"])

    # 4 Thick Sturdy Legs & Wide Paws
    leg_mesh = make_cylinder_mesh("Bear_Leg_Mesh", radius=0.13, depth=0.38)
    paw_mesh = make_sphere_mesh("Bear_Paw_Mesh", radius=0.14, scale=(1.0, 1.25, 0.65))

    bear_legs = [
        ("FL", -0.22, -0.32),
        ("FR",  0.22, -0.32),
        ("BL", -0.24,  0.34),
        ("BR",  0.24,  0.34),
    ]
    for tag, lx, ly in bear_legs:
        create_sub_mesh_part(f"Bear_Leg_{tag}", leg_mesh, (lx, ly, 0.22), (0, 0, 0), (1, 1, 1), mats["bear_brown"], root, colls["animals"])
        create_sub_mesh_part(f"Bear_Paw_{tag}", paw_mesh, (lx, ly - 0.04, 0.06), (0, 0, 0), (1, 1, 1), mats["bear_brown"], root, colls["animals"])

    # Bobtail
    tail_mesh = make_sphere_mesh("Bear_Tail_Mesh", radius=0.10)
    create_sub_mesh_part("Bear_Tail", tail_mesh, (0, 0.58, 0.56), (0, 0, 0), (1, 1, 1), mats["bear_brown"], root, colls["animals"])

    return root

# 4. GREY WOLF FIGURINE (Slate coat, white ruff/chest, pointed snout, alert ears, bushy tail)
def build_wolf_grey(colls, mats, base_pos=(-3.6, 0.0, 0.12), rot_z=70):
    root = bpy.data.objects.new("Animal_Wolf_Grey", None)
    root.empty_display_type = 'ARROWS'
    root.empty_display_size = 0.4
    root.location = base_pos
    root.rotation_euler = Euler((0, 0, math.radians(rot_z)), 'XYZ')
    colls["animals"].objects.link(root)

    # Torso
    torso_mesh = make_sphere_mesh("WolfG_Torso_Mesh", radius=0.34, scale=(0.85, 1.40, 0.95))
    create_sub_mesh_part("WolfG_Torso", torso_mesh, (0, 0.0, 0.48), (math.radians(-8), 0, 0), (1, 1, 1), mats["wolf_grey"], root, colls["animals"])

    # White Neck Ruff & Chest
    ruff_mesh = make_sphere_mesh("WolfG_Ruff_Mesh", radius=0.26, scale=(0.80, 1.0, 1.15))
    create_sub_mesh_part("WolfG_Ruff", ruff_mesh, (0, -0.28, 0.54), (math.radians(18), 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    # Head
    head_mesh = make_sphere_mesh("WolfG_Head_Mesh", radius=0.22, scale=(0.95, 1.20, 0.95))
    create_sub_mesh_part("WolfG_Head", head_mesh, (0, -0.46, 0.74), (math.radians(8), 0, 0), (1, 1, 1), mats["wolf_grey"], root, colls["animals"])

    # Muzzle: Pointed lupine snout
    snout_mesh = make_cone_mesh("WolfG_Snout_Mesh", r1=0.11, r2=0.03, depth=0.24)
    create_sub_mesh_part("WolfG_Snout", snout_mesh, (0, -0.66, 0.70), (math.radians(85), 0, 0), (1, 1, 1), mats["wolf_grey"], root, colls["animals"])

    # White Under-Snout
    chin_mesh = make_box_mesh("WolfG_Chin_Mesh", size=(0.10, 0.16, 0.05), bevel_radius=0.015)
    create_sub_mesh_part("WolfG_Chin", chin_mesh, (0, -0.64, 0.66), (math.radians(10), 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    # Nose
    nose_mesh = make_sphere_mesh("WolfG_Nose_Mesh", radius=0.045)
    create_sub_mesh_part("WolfG_Nose", nose_mesh, (0, -0.78, 0.71), (0, 0, 0), (1, 1, 1), mats["wolf_nose"], root, colls["animals"])

    # Almond Eyes: Inlaid sleek canid eyes flush with skull
    eye_mesh = make_sphere_mesh("WolfG_Eye_Mesh", radius=0.040, scale=(1.0, 0.35, 1.25))
    create_sub_mesh_part("WolfG_Eye_L", eye_mesh, (-0.112, -0.668, 0.786), (math.radians(-25), math.radians(-15), math.radians(15)), (1, 1, 1), mats["eye_dark"], root, colls["animals"])
    create_sub_mesh_part("WolfG_Eye_R", eye_mesh, (0.112, -0.668, 0.786), (math.radians(-25), math.radians(15), math.radians(-15)), (1, 1, 1), mats["eye_dark"], root, colls["animals"])

    catch_mesh = make_sphere_mesh("WolfG_Catch", radius=0.012)
    create_sub_mesh_part("WolfG_Catch_L", catch_mesh, (-0.118, -0.682, 0.796), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])
    create_sub_mesh_part("WolfG_Catch_R", catch_mesh, (0.118, -0.682, 0.796), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])

    # Pointed Upright Ears
    ear_mesh = make_cone_mesh("WolfG_Ear_Mesh", r1=0.095, r2=0.01, depth=0.26)
    create_sub_mesh_part("WolfG_Ear_L", ear_mesh, (-0.13, -0.40, 0.98), (math.radians(-10), math.radians(-18), 0), (0.7, 1, 1), mats["wolf_grey"], root, colls["animals"])
    create_sub_mesh_part("WolfG_Ear_R", ear_mesh, (0.13, -0.40, 0.98), (math.radians(-10), math.radians(18), 0), (0.7, 1, 1), mats["wolf_grey"], root, colls["animals"])

    ear_inner = make_cone_mesh("WolfG_Ear_Inner", r1=0.065, r2=0.008, depth=0.20)
    create_sub_mesh_part("WolfG_Ear_In_L", ear_inner, (-0.12, -0.42, 0.97), (math.radians(-8), math.radians(-18), 0), (0.6, 0.8, 0.9), mats["wolf_inner_ear"], root, colls["animals"])
    create_sub_mesh_part("WolfG_Ear_In_R", ear_inner, (0.12, -0.42, 0.97), (math.radians(-8), math.radians(18), 0), (0.6, 0.8, 0.9), mats["wolf_inner_ear"], root, colls["animals"])

    # 4 Legs
    leg_mesh = make_cylinder_mesh("WolfG_Leg_Mesh", radius=0.065, depth=0.36)
    paw_mesh = make_sphere_mesh("WolfG_Paw_Mesh", radius=0.075, scale=(0.9, 1.25, 0.6))

    wolf_legs = [
        ("FL", -0.15, -0.24),
        ("FR",  0.15, -0.24),
        ("BL", -0.16,  0.28),
        ("BR",  0.16,  0.28),
    ]
    for tag, lx, ly in wolf_legs:
        create_sub_mesh_part(f"WolfG_Leg_{tag}", leg_mesh, (lx, ly, 0.22), (0, 0, 0), (1, 1, 1), mats["wolf_grey"], root, colls["animals"])
        create_sub_mesh_part(f"WolfG_Paw_{tag}", paw_mesh, (lx, ly - 0.03, 0.05), (0, 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    # Bushy Tail
    tail_base = make_sphere_mesh("WolfG_Tail_Base", radius=0.13, scale=(1.0, 1.3, 1.0))
    create_sub_mesh_part("WolfG_Tail_Base", tail_base, (0, 0.46, 0.44), (math.radians(45), 0, 0), (1, 1, 1), mats["wolf_grey"], root, colls["animals"])

    tail_tip = make_cone_mesh("WolfG_Tail_Tip", r1=0.12, r2=0.02, depth=0.30)
    create_sub_mesh_part("WolfG_Tail_Tip", tail_tip, (0, 0.62, 0.30), (math.radians(120), 0, 0), (1, 1, 1), mats["wolf_grey"], root, colls["animals"])

    return root

# 5. WHITE WOLF FIGURINE (Ivory coat, fluffy mane, upright ears, lupine stance)
def build_wolf_white(colls, mats, base_pos=(-1.2, 2.4, 0.12), rot_z=60):
    root = bpy.data.objects.new("Animal_Wolf_White", None)
    root.empty_display_type = 'ARROWS'
    root.empty_display_size = 0.4
    root.location = base_pos
    root.rotation_euler = Euler((0, 0, math.radians(rot_z)), 'XYZ')
    colls["animals"].objects.link(root)

    # Torso
    torso_mesh = make_sphere_mesh("WolfW_Torso_Mesh", radius=0.34, scale=(0.85, 1.40, 0.95))
    create_sub_mesh_part("WolfW_Torso", torso_mesh, (0, 0.0, 0.48), (math.radians(-8), 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    # Fluffy Neck Mane
    ruff_mesh = make_sphere_mesh("WolfW_Ruff_Mesh", radius=0.28, scale=(0.85, 1.05, 1.18))
    create_sub_mesh_part("WolfW_Ruff", ruff_mesh, (0, -0.28, 0.54), (math.radians(18), 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    # Head
    head_mesh = make_sphere_mesh("WolfW_Head_Mesh", radius=0.22, scale=(0.95, 1.20, 0.95))
    create_sub_mesh_part("WolfW_Head", head_mesh, (0, -0.46, 0.74), (math.radians(8), 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    # Snout
    snout_mesh = make_cone_mesh("WolfW_Snout_Mesh", r1=0.11, r2=0.03, depth=0.24)
    create_sub_mesh_part("WolfW_Snout", snout_mesh, (0, -0.66, 0.70), (math.radians(85), 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    # Black Nose
    nose_mesh = make_sphere_mesh("WolfW_Nose_Mesh", radius=0.045)
    create_sub_mesh_part("WolfW_Nose", nose_mesh, (0, -0.78, 0.71), (0, 0, 0), (1, 1, 1), mats["wolf_nose"], root, colls["animals"])

    # Almond Eyes: Inlaid sleek dark eyes flush with skull
    eye_mesh = make_sphere_mesh("WolfW_Eye_Mesh", radius=0.040, scale=(1.0, 0.35, 1.25))
    create_sub_mesh_part("WolfW_Eye_L", eye_mesh, (-0.112, -0.668, 0.786), (math.radians(-25), math.radians(-15), math.radians(15)), (1, 1, 1), mats["eye_dark"], root, colls["animals"])
    create_sub_mesh_part("WolfW_Eye_R", eye_mesh, (0.112, -0.668, 0.786), (math.radians(-25), math.radians(15), math.radians(-15)), (1, 1, 1), mats["eye_dark"], root, colls["animals"])

    catch_mesh = make_sphere_mesh("WolfW_Catch", radius=0.012)
    create_sub_mesh_part("WolfW_Catch_L", catch_mesh, (-0.118, -0.682, 0.796), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])
    create_sub_mesh_part("WolfW_Catch_R", catch_mesh, (0.118, -0.682, 0.796), (0, 0, 0), (1, 1, 1), mats["eye_white"], root, colls["animals"])

    # Ears
    ear_mesh = make_cone_mesh("WolfW_Ear_Mesh", r1=0.095, r2=0.01, depth=0.26)
    create_sub_mesh_part("WolfW_Ear_L", ear_mesh, (-0.13, -0.40, 0.98), (math.radians(-10), math.radians(-18), 0), (0.7, 1, 1), mats["wolf_white"], root, colls["animals"])
    create_sub_mesh_part("WolfW_Ear_R", ear_mesh, (0.13, -0.40, 0.98), (math.radians(-10), math.radians(18), 0), (0.7, 1, 1), mats["wolf_white"], root, colls["animals"])

    ear_inner = make_cone_mesh("WolfW_Ear_Inner", r1=0.065, r2=0.008, depth=0.20)
    create_sub_mesh_part("WolfW_Ear_In_L", ear_inner, (-0.12, -0.42, 0.97), (math.radians(-8), math.radians(-18), 0), (0.6, 0.8, 0.9), mats["wolf_inner_ear"], root, colls["animals"])
    create_sub_mesh_part("WolfW_Ear_In_R", ear_inner, (0.12, -0.42, 0.97), (math.radians(-8), math.radians(18), 0), (0.6, 0.8, 0.9), mats["wolf_inner_ear"], root, colls["animals"])

    # 4 Legs
    leg_mesh = make_cylinder_mesh("WolfW_Leg_Mesh", radius=0.065, depth=0.36)
    paw_mesh = make_sphere_mesh("WolfW_Paw_Mesh", radius=0.075, scale=(0.9, 1.25, 0.6))

    wolf_legs = [
        ("FL", -0.15, -0.24),
        ("FR",  0.15, -0.24),
        ("BL", -0.16,  0.28),
        ("BR",  0.16,  0.28),
    ]
    for tag, lx, ly in wolf_legs:
        create_sub_mesh_part(f"WolfW_Leg_{tag}", leg_mesh, (lx, ly, 0.22), (0, 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])
        create_sub_mesh_part(f"WolfW_Paw_{tag}", paw_mesh, (lx, ly - 0.03, 0.05), (0, 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    # Bushy White Tail
    tail_base = make_sphere_mesh("WolfW_Tail_Base", radius=0.13, scale=(1.0, 1.3, 1.0))
    create_sub_mesh_part("WolfW_Tail_Base", tail_base, (0, 0.46, 0.44), (math.radians(45), 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    tail_tip = make_cone_mesh("WolfW_Tail_Tip", r1=0.12, r2=0.02, depth=0.30)
    create_sub_mesh_part("WolfW_Tail_Tip", tail_tip, (0, 0.62, 0.30), (math.radians(120), 0, 0), (1, 1, 1), mats["wolf_white"], root, colls["animals"])

    return root

# ==============================================================================
# LIGHTING, CAMERA, WORLD & FREESTYLE SETUP
# ==============================================================================
def setup_camera_lighting_freestyle(colls):
    scene = bpy.context.scene

    # Pure White Canvas World Background (matching reference illustration)
    # Using Light Path so camera sees pure white without blowing out scene lighting
    world = bpy.data.worlds.new("World_CleanWhite")
    scene.world = world
    world.use_nodes = True
    wnodes = world.node_tree.nodes
    wlinks = world.node_tree.links
    wnodes.clear()

    w_out = wnodes.new('ShaderNodeOutputWorld')
    w_mix = wnodes.new('ShaderNodeMixShader')
    w_lp = wnodes.new('ShaderNodeLightPath')

    bg_cam = wnodes.new('ShaderNodeBackground')
    bg_cam.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1.0)
    bg_cam.inputs['Strength'].default_value = 1.0

    bg_ambient = wnodes.new('ShaderNodeBackground')
    bg_ambient.inputs['Color'].default_value = (0.75, 0.85, 0.95, 1.0)
    bg_ambient.inputs['Strength'].default_value = 0.25

    wlinks.new(w_lp.outputs['Is Camera Ray'], w_mix.inputs['Fac'])
    wlinks.new(bg_ambient.outputs['Background'], w_mix.inputs[1])
    wlinks.new(bg_cam.outputs['Background'], w_mix.inputs[2])
    wlinks.new(w_mix.outputs['Shader'], w_out.inputs['Surface'])

    # True Isometric Orthographic Camera
    cam_data = bpy.data.cameras.new("Camera_Main")
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 14.8
    cam_data.clip_start = 0.1
    cam_data.clip_end = 200.0

    cam_obj = bpy.data.objects.new("Camera_Main", cam_data)
    cam_obj.location = (14.0, -14.0, 14.0)
    cam_obj.rotation_euler = Euler((math.radians(54.736), 0, math.radians(45)), 'XYZ')
    colls["lights"].objects.link(cam_obj)
    scene.camera = cam_obj

    # Key Sunlight: Warm Golden Sun (Elevation ~55°, Azimuth ~45°)
    sun_data = bpy.data.lights.new("Sun_Main", type='SUN')
    sun_data.color = (1.0, 0.94, 0.85)
    sun_data.energy = 3.2
    sun_data.angle = math.radians(4.0) # Soft, natural contact shadows

    sun_obj = bpy.data.objects.new("Sun_Main", sun_data)
    sun_obj.rotation_euler = Euler((math.radians(50), math.radians(20), math.radians(-35)), 'XYZ')
    colls["lights"].objects.link(sun_obj)

    # Ambient Fill Light: Soft Sky Tint
    fill_data = bpy.data.lights.new("Sun_Sky_Fill", type='SUN')
    fill_data.color = (0.82, 0.92, 1.0)
    fill_data.energy = 0.9
    fill_data.angle = math.radians(20.0)

    fill_obj = bpy.data.objects.new("Sun_Sky_Fill", fill_data)
    fill_obj.rotation_euler = Euler((math.radians(-40), math.radians(-30), math.radians(120)), 'XYZ')
    colls["lights"].objects.link(fill_obj)

    # Render & Color Management Settings
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'High Contrast'
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100

    # Freestyle Cartoon Outlines (matching 2D ink style)
    scene.render.use_freestyle = True
    vl = scene.view_layers[0]
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    fs.as_render_pass = False

    # Configure LineSet
    for ls in list(fs.linesets):
        fs.linesets.remove(ls)
    lineset = fs.linesets.new("Cartoon_Ink")
    lineset.select_silhouette = True
    lineset.select_border = True
    lineset.select_crease = True
    fs.crease_angle = math.radians(145)

    # Line Style: Dark Warm Charcoal/Sepia ink
    linestyle = bpy.data.linestyles.new("Cartoon_Ink_Style")
    lineset.linestyle = linestyle
    linestyle.thickness = 1.15
    linestyle.color = (0.16, 0.10, 0.08)

# ==============================================================================
# MAIN BUILD PIPELINE
# ==============================================================================
def build_complete_scene():
    print("Clearing scene...")
    safe_clear_scene()

    print("Setting up collections...")
    colls = setup_collections()

    print("Creating materials...")
    mats = create_materials()

    print("Constructing board base, lawn platform, scalloped foliage border, and 81 tiles...")
    tiles = create_board_base_and_tiles(colls, mats)

    print("Generating parametric hedge labyrinth walls...")
    walls = create_all_hedge_walls(colls, mats)

    print("Spawning high-detail animal figurines...")
    owl = build_owl(colls, mats)
    fox = build_fox(colls, mats)
    bear = build_bear(colls, mats)
    wolf_grey = build_wolf_grey(colls, mats)
    wolf_white = build_wolf_white(colls, mats)

    print("Configuring camera, lighting, and Freestyle line art...")
    setup_camera_lighting_freestyle(colls)

    # Save .blend and export .glb
    blend_path = "/Users/vm/WebstormProjects/quoridors/quoridor_board.blend"
    glb_path = "/Users/vm/WebstormProjects/quoridors/quoridor_board.glb"
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved native Blender file to {blend_path}")

    try:
        bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', use_selection=False, export_apply=True)
        print(f"Exported GLB model to {glb_path}")
    except Exception as e:
        print(f"GLTF export note: {e}")

    print("Done building Quoridor scene!")

if __name__ == "__main__":
    build_complete_scene()
