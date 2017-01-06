var camera, scene;
var MTS = 1e7;
var PI = Math.PI;
var shipName;
var z0, x0;
var lifeSocket;

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
  renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.8);

  var container = document.getElementById("three-container");
  container.appendChild(renderer.domElement);

  setKeys();

  lifeSocket = new WebSocket(socketHost);
  var collisionSocket = new WebSocket(socketHost);

  lifeSocket.onopen = function (event) {
    lifeSocket.send(JSON.stringify({message:"init"}));
    lifeSocket.send(JSON.stringify({message:"scan rocks"}));
  }

  lifeSocket.onmessage = function(event) {
    var data  = JSON.parse(event.data);
    if ( data.message == "init" ) {
      var angle = data.name;
      var lat = Number(data.lat);
      var lng = Number(data.lng);
      shipName = angle;
      angle = Number(angle);

      camera.position.z = z0 = lng * MTS;
      camera.position.x = x0 = lat * MTS;
      camera.rotateY((90-angle) * PI /180);

      showMessage("Welcome ship" + shipName);

      lifeSocket.send(JSON.stringify({
        message:"show collitions", name: shipName
      }));

      setInterval(sendPosition, 500);
      setInterval(function(){
        lifeSocket.send(JSON.stringify({message:"scan ships"}));
      }, 500);
    }
    if (data.message == "rocks")
      showRocks(data.data);
    if (data.message == "ships")
      show_ships(data.data);
    if (data.message == "show collitions")
      showCollition(data.data);
  }

}

function setKeys() {
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

function sendPosition() {
  var lat = camera.position.x / MTS;
  var lng = camera.position.z / MTS;
  lifeSocket.send(JSON.stringify({
    message: "set position", name:shipName, lat:lat, lng:lng
  }));
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

function showCollition(data) {
  var data = JSON.parse(data);
  if (data.detect == 'roam') {
    camera.position.x = x0;
    camera.position.z = z0;
    var msg = "Ship" + shipName + " collision with rock " + data.nearby.id + "!";
    showMessage(msg);
    showMessage("Restarted");
  }
}

function showMessage(msg) {
  var msgBox = document.getElementsByClassName('log-history')[0];
  msgBox.innerHTML += new Date() + ": "+ msg + '<br />';
}

function showRocks(data) {
  var material = new THREE.MeshBasicMaterial({
    color: 0xF3E5F5,
    wireframe: true
  });

  for (const rock of data) {
    var name = rock[0];
    var coor = JSON.parse(rock[1]).coordinates;
    var lat = coor[0];
    var lng = coor[1];
    var geometry = new THREE.BoxGeometry(100, 400, 100);
    var mesh_rock  = new THREE.Mesh(geometry, material);
    mesh_rock.name = name;
    mesh_rock.position.x = lat * MTS;
    mesh_rock.position.z = lng * MTS;
    scene.add(mesh_rock);
  }
}

function show_ships(data) {
  var material = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    wireframe: true
  });

  for (const ship of data) {
    var name = ship[0];
    if ( name == shipName ) continue;
    var coor = JSON.parse(ship[1]).coordinates;
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
}
