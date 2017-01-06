var camera, scene;
var MTS = 1e7;
var PI = Math.PI;
var ship_name;
var z0, x0;
var socketLife;

var tile38Host = "localhost";
var tile38 = "ws://" + tile38Host+ ":9851";

var socketHost = "localhost";
socketHost = "ws://" + socketHost + ":8080";

init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.86);

  var container = document.getElementById("three-container");
  container.appendChild(renderer.domElement);

  set_keys();

  socketLife = new WebSocket(socketHost);

  socketLife.onopen = function (event) {
    socketLife.send('');
  }

  socketLife.onmessage = function(event) {
    var ship = JSON.parse(event.data);
    var angle = ship.name;
    var lat = Number(ship.lat);
    var lng = Number(ship.lng);
    ship_name = angle;
    angle = Number(angle);

    camera.position.z = z0 = lng * MTS;
    camera.position.x = x0 = lat * MTS;
    camera.rotateY((90-angle) * PI /180);

    show_msg_and_clear("Welcome ship" + ship_name, "");

    show_rocks();
    show_collition();

    setInterval(send_position, 500);
    setInterval(show_ships, 500);
  }

}

// Mozilla developer network
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function set_keys() {
  window.addEventListener('keydown', function(event) {
    switch (event.keyCode) {
      case 87: // w
        var direction = camera.getWorldDirection();
        camera.position.add( direction.multiplyScalar(20) );
        break;
      case 65: // a
        camera.rotateY(5*PI/180);
        break;
      case 68: // d
        camera.rotateY(-5*PI/180);
        break;
      case 32: // space
        break;
    }
  });
}

function send_position() {
  var lat = camera.position.x / MTS;
  var lng = camera.position.z / MTS;
  socketLife.send(JSON.stringify({name:ship_name, lat:lat, lng:lng}));
}

function animate() {
  requestAnimationFrame(animate);

  for (const rock of scene.children) {
    rock.rotation.y += 0.01;
  }

  var direction = camera.getWorldDirection();
  camera.position.add( direction.multiplyScalar(4) );

  renderer.render(scene, camera);
}

function show_collition() {
  var url =  tile38 + "/NEARBY+ships+match+"+ship_name+"+fence+roam+rocks+*+1";
  var socket = new WebSocket(url);
  socket.onmessage = function(event) {
    var data = JSON.parse(event.data);
    if (data.detect == 'roam') {
      camera.position.x = x0;
      camera.position.z = z0;
      var msg = "Ship:" + ship_name + ": Collision with rock " + data.nearby.id + "!";
      show_msg_and_clear(msg, "Restarted");
    }
  }
}

function show_msg_and_clear(msg, clear_msg) {
      var msg_box = document.getElementsByClassName('msg-p')[0];
      msg_box.textContent = msg;
      setTimeout(function() {
        msg_box.textContent = clear_msg;
      }, 2000);
}

function show_rocks() {
  var material = new THREE.MeshBasicMaterial({
    color: 0xF3E5F5,
    wireframe: true
  });
  var socket = new WebSocket(tile38 + "/scan+rocks");

  socket.onmessage = function(event) {
    var data = JSON.parse(event.data);
    for (const rock of data.objects) {
      var name = rock.id;
      var coor = rock.object.coordinates;
      var lat = coor[0];
      var lng = coor[1];
      var geometry = new THREE.BoxGeometry(100, 400, 100);
      var mesh_rock  = new THREE.Mesh(geometry, material);
      mesh_rock.name = name;
      mesh_rock.position.x = lat * MTS;
      mesh_rock.position.z = lng * MTS;
      scene.add(mesh_rock);
    }
  };
}

function show_ships() {
  var material = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    wireframe: true
  });
  var socket = new WebSocket(tile38 + "/scan+ships");

  socket.onmessage = function(event) {
    var data = JSON.parse(event.data);
    for (const ship of data.objects) {
      var name = ship.id;
      if ( name == ship_name ) continue;
      var coor = ship.object.coordinates;
      var lat = coor[0] * MTS;
      var lng = coor[1] * MTS;
      var local_ship = scene.getObjectByName(name);
      if (local_ship) {
        local_ship.position.x = lat;
        local_ship.position.z = lng;
      } else {
        var geometry = new THREE.SphereGeometry(20, 10, 4);
        var mesh_ship  = new THREE.Mesh(geometry, material);
        mesh_ship.name = name;
        mesh_ship.position.x = lat;
        mesh_ship.position.z = lng;
        scene.add(mesh_ship);
      }
    }
  };
}
